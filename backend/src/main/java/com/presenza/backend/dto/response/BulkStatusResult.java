package com.presenza.backend.dto.response;

import java.util.List;

public record BulkStatusResult(int updated, List<String> errors) {
}
