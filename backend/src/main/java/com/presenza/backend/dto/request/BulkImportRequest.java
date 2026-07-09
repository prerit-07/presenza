package com.presenza.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

/** Raw CSV text, one member per line: name,email,title (email and title optional). */
@Getter @Setter
public class BulkImportRequest {
    private String csv;
}
