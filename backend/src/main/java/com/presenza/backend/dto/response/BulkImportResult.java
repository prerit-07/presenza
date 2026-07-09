package com.presenza.backend.dto.response;

import java.util.List;

public record BulkImportResult(int created, int skipped, List<String> errors) {
}
