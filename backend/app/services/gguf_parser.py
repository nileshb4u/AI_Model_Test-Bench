import os
import re
import struct
from typing import Any, Optional


GGUF_MAGIC = 0x46475547

GGUF_METADATA_VALUE_TYPE = {
    0: "uint8",
    1: "int8",
    2: "uint16",
    3: "int16",
    4: "uint32",
    5: "int32",
    6: "float32",
    7: "bool",
    8: "string",
    9: "array",
    10: "uint64",
    11: "int64",
    12: "float64",
}

QUANTIZATION_PATTERNS = [
    r"[_.-](Q2_K_S)[_.\s-]",
    r"[_.-](Q2_K)[_.\s-]",
    r"[_.-](Q3_K_S)[_.\s-]",
    r"[_.-](Q3_K_M)[_.\s-]",
    r"[_.-](Q3_K_L)[_.\s-]",
    r"[_.-](Q4_0)[_.\s-]",
    r"[_.-](Q4_1)[_.\s-]",
    r"[_.-](Q4_K_S)[_.\s-]",
    r"[_.-](Q4_K_M)[_.\s-]",
    r"[_.-](Q5_0)[_.\s-]",
    r"[_.-](Q5_1)[_.\s-]",
    r"[_.-](Q5_K_S)[_.\s-]",
    r"[_.-](Q5_K_M)[_.\s-]",
    r"[_.-](Q6_K)[_.\s-]",
    r"[_.-](Q8_0)[_.\s-]",
    r"[_.-](IQ1_S)[_.\s-]",
    r"[_.-](IQ1_M)[_.\s-]",
    r"[_.-](IQ2_XXS)[_.\s-]",
    r"[_.-](IQ2_XS)[_.\s-]",
    r"[_.-](IQ2_S)[_.\s-]",
    r"[_.-](IQ2_M)[_.\s-]",
    r"[_.-](IQ3_XXS)[_.\s-]",
    r"[_.-](IQ3_XS)[_.\s-]",
    r"[_.-](IQ3_S)[_.\s-]",
    r"[_.-](IQ3_M)[_.\s-]",
    r"[_.-](IQ4_NL)[_.\s-]",
    r"[_.-](IQ4_XS)[_.\s-]",
    r"[_.-](F16)[_.\s-]",
    r"[_.-](F32)[_.\s-]",
    r"[_.-](BF16)[_.\s-]",
]


def _read_string(f) -> str:
    length = struct.unpack("<Q", f.read(8))[0]
    return f.read(length).decode("utf-8", errors="replace")


def _read_metadata_value(f, value_type: int) -> Any:
    if value_type == 0:  # uint8
        return struct.unpack("<B", f.read(1))[0]
    elif value_type == 1:  # int8
        return struct.unpack("<b", f.read(1))[0]
    elif value_type == 2:  # uint16
        return struct.unpack("<H", f.read(2))[0]
    elif value_type == 3:  # int16
        return struct.unpack("<h", f.read(2))[0]
    elif value_type == 4:  # uint32
        return struct.unpack("<I", f.read(4))[0]
    elif value_type == 5:  # int32
        return struct.unpack("<i", f.read(4))[0]
    elif value_type == 6:  # float32
        return struct.unpack("<f", f.read(4))[0]
    elif value_type == 7:  # bool
        return struct.unpack("<?", f.read(1))[0]
    elif value_type == 8:  # string
        return _read_string(f)
    elif value_type == 9:  # array
        array_type = struct.unpack("<I", f.read(4))[0]
        array_length = struct.unpack("<Q", f.read(8))[0]
        return [_read_metadata_value(f, array_type) for _ in range(array_length)]
    elif value_type == 10:  # uint64
        return struct.unpack("<Q", f.read(8))[0]
    elif value_type == 11:  # int64
        return struct.unpack("<q", f.read(8))[0]
    elif value_type == 12:  # float64
        return struct.unpack("<d", f.read(8))[0]
    else:
        raise ValueError(f"Unknown metadata value type: {value_type}")


def _estimate_parameters_from_size(file_size_bytes: int, quantization: Optional[str] = None) -> str:
    bits_per_param = 4.0
    if quantization:
        q = quantization.upper()
        if "Q2" in q or "IQ1" in q or "IQ2" in q:
            bits_per_param = 2.5
        elif "Q3" in q or "IQ3" in q:
            bits_per_param = 3.5
        elif "Q4" in q or "IQ4" in q:
            bits_per_param = 4.5
        elif "Q5" in q:
            bits_per_param = 5.5
        elif "Q6" in q:
            bits_per_param = 6.5
        elif "Q8" in q:
            bits_per_param = 8.5
        elif "F16" in q or "BF16" in q:
            bits_per_param = 16.0
        elif "F32" in q:
            bits_per_param = 32.0

    estimated_params = (file_size_bytes * 8) / bits_per_param
    if estimated_params >= 1e12:
        return f"{estimated_params / 1e12:.1f}T"
    elif estimated_params >= 1e9:
        return f"{estimated_params / 1e9:.1f}B"
    elif estimated_params >= 1e6:
        return f"{estimated_params / 1e6:.0f}M"
    else:
        return f"{estimated_params:.0f}"


def _extract_quantization_from_filename(filename: str) -> Optional[str]:
    padded = f".{filename}."
    for pattern in QUANTIZATION_PATTERNS:
        match = re.search(pattern, padded, re.IGNORECASE)
        if match:
            return match.group(1).upper()
    return None


def parse_gguf_metadata(file_path: str) -> dict:
    result = {
        "architecture": None,
        "context_length": None,
        "quantization": None,
        "parameter_count": None,
        "file_size_bytes": None,
    }

    if not os.path.exists(file_path):
        return result

    file_size = os.path.getsize(file_path)
    result["file_size_bytes"] = file_size

    filename = os.path.basename(file_path)
    result["quantization"] = _extract_quantization_from_filename(filename)

    try:
        with open(file_path, "rb") as f:
            magic = struct.unpack("<I", f.read(4))[0]
            if magic != GGUF_MAGIC:
                result["parameter_count"] = _estimate_parameters_from_size(
                    file_size, result["quantization"]
                )
                return result

            version = struct.unpack("<I", f.read(4))[0]
            if version < 2 or version > 3:
                result["parameter_count"] = _estimate_parameters_from_size(
                    file_size, result["quantization"]
                )
                return result

            tensor_count = struct.unpack("<Q", f.read(8))[0]
            metadata_kv_count = struct.unpack("<Q", f.read(8))[0]

            metadata = {}
            for _ in range(metadata_kv_count):
                try:
                    key = _read_string(f)
                    value_type = struct.unpack("<I", f.read(4))[0]
                    value = _read_metadata_value(f, value_type)
                    metadata[key] = value
                except (struct.error, ValueError, UnicodeDecodeError, OverflowError, MemoryError):
                    break

            arch = metadata.get("general.architecture")
            if arch:
                result["architecture"] = str(arch)

            ctx_key = f"{arch}.context_length" if arch else None
            if ctx_key and ctx_key in metadata:
                result["context_length"] = int(metadata[ctx_key])
            elif "general.context_length" in metadata:
                result["context_length"] = int(metadata["general.context_length"])

            file_type = metadata.get("general.file_type")
            if file_type is not None and result["quantization"] is None:
                file_type_map = {
                    0: "F32",
                    1: "F16",
                    2: "Q4_0",
                    3: "Q4_1",
                    7: "Q8_0",
                    8: "Q5_0",
                    9: "Q5_1",
                    10: "Q2_K",
                    11: "Q3_K_S",
                    12: "Q3_K_M",
                    13: "Q3_K_L",
                    14: "Q4_K_S",
                    15: "Q4_K_M",
                    16: "Q5_K_S",
                    17: "Q5_K_M",
                    18: "Q6_K",
                }
                result["quantization"] = file_type_map.get(int(file_type))

            param_count = metadata.get("general.parameter_count")
            if param_count:
                pc = int(param_count)
                if pc >= 1e12:
                    result["parameter_count"] = f"{pc / 1e12:.1f}T"
                elif pc >= 1e9:
                    result["parameter_count"] = f"{pc / 1e9:.1f}B"
                elif pc >= 1e6:
                    result["parameter_count"] = f"{pc / 1e6:.0f}M"
                else:
                    result["parameter_count"] = str(pc)
            else:
                result["parameter_count"] = _estimate_parameters_from_size(
                    file_size, result["quantization"]
                )

    except (OSError, struct.error, Exception):
        result["parameter_count"] = _estimate_parameters_from_size(
            file_size, result["quantization"]
        )

    return result
