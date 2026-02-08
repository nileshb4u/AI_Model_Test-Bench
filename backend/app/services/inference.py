import asyncio
import time
from typing import AsyncGenerator, Optional

from app.services.metrics import MetricsCollector

try:
    from llama_cpp import Llama

    LLAMA_CPP_AVAILABLE = True
except ImportError:
    LLAMA_CPP_AVAILABLE = False
    Llama = None


class InferenceEngine:
    def __init__(self) -> None:
        self._model: Optional[object] = None
        self._model_path: Optional[str] = None
        self._lock = asyncio.Lock()

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    @property
    def current_model_path(self) -> Optional[str]:
        return self._model_path

    async def load_model(
        self,
        file_path: str,
        n_ctx: int = 2048,
        n_threads: int = 4,
        n_gpu_layers: int = 0,
        n_batch: int = 512,
    ) -> None:
        if not LLAMA_CPP_AVAILABLE:
            raise RuntimeError(
                "llama-cpp-python is not installed. "
                "Install it with: pip install llama-cpp-python"
            )

        async with self._lock:
            if self._model is not None and self._model_path == file_path:
                return

            if self._model is not None:
                await self._do_unload()

            def _load() -> object:
                return Llama(
                    model_path=file_path,
                    n_ctx=n_ctx,
                    n_threads=n_threads,
                    n_gpu_layers=n_gpu_layers,
                    n_batch=n_batch,
                    verbose=False,
                )

            self._model = await asyncio.get_event_loop().run_in_executor(None, _load)
            self._model_path = file_path

    async def _do_unload(self) -> None:
        if self._model is not None:
            del self._model
            self._model = None
            self._model_path = None

    async def unload_model(self) -> None:
        async with self._lock:
            await self._do_unload()

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str],
        config: dict,
    ) -> AsyncGenerator[dict, None]:
        if not LLAMA_CPP_AVAILABLE:
            raise RuntimeError("llama-cpp-python is not installed.")

        if self._model is None:
            raise RuntimeError("No model is loaded. Call load_model() first.")

        full_prompt = ""
        if system_prompt:
            full_prompt = f"### System:\n{system_prompt}\n\n### User:\n{prompt}\n\n### Assistant:\n"
        else:
            full_prompt = f"### User:\n{prompt}\n\n### Assistant:\n"

        temperature = config.get("temperature", 0.7)
        top_p = config.get("top_p", 0.9)
        top_k = config.get("top_k", 40)
        min_p = config.get("min_p", 0.05)
        repeat_penalty = config.get("repeat_penalty", 1.1)
        frequency_penalty = config.get("frequency_penalty", 0.0)
        presence_penalty = config.get("presence_penalty", 0.0)
        mirostat_mode = config.get("mirostat_mode", 0)
        mirostat_tau = config.get("mirostat_tau", 5.0)
        mirostat_eta = config.get("mirostat_eta", 0.1)
        max_tokens = config.get("max_tokens", 512)
        seed = config.get("seed", -1)

        if seed == -1:
            seed = None

        model = self._model
        collector = MetricsCollector()
        token_count = 0
        output_tokens: list[str] = []

        def _stream_generate():
            return model(
                full_prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                min_p=min_p,
                repeat_penalty=repeat_penalty,
                frequency_penalty=frequency_penalty,
                presence_penalty=presence_penalty,
                mirostat_mode=mirostat_mode,
                mirostat_tau=mirostat_tau,
                mirostat_eta=mirostat_eta,
                seed=seed,
                stream=True,
            )

        collector.start()

        stream = await asyncio.get_event_loop().run_in_executor(None, _stream_generate)

        first_token_recorded = False

        try:
            while True:
                def _next_chunk(s):
                    try:
                        return next(s)
                    except StopIteration:
                        return None

                chunk = await asyncio.get_event_loop().run_in_executor(None, _next_chunk, stream)

                if chunk is None:
                    break

                choices = chunk.get("choices", [])
                if not choices:
                    continue

                token_text = choices[0].get("text", "")
                if not token_text:
                    continue

                if not first_token_recorded:
                    collector.record_first_token()
                    first_token_recorded = True

                token_count += 1
                output_tokens.append(token_text)

                if token_count % 10 == 0:
                    collector.update_peak_memory()

                yield {
                    "token": token_text,
                    "done": False,
                    "metrics": None,
                }

        except Exception as e:
            collector.finish(token_count)
            yield {
                "token": "",
                "done": True,
                "error": str(e),
                "metrics": collector.get_metrics(),
            }
            return

        collector.finish(token_count)
        metrics = collector.get_metrics()

        yield {
            "token": "",
            "done": True,
            "metrics": metrics,
            "full_output": "".join(output_tokens),
        }


engine = InferenceEngine()
