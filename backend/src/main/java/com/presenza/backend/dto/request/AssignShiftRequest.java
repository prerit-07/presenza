package com.presenza.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

/** { "shiftId": 3 } — pass null shiftId to unassign. */
@Getter @Setter
public class AssignShiftRequest {
    private Long shiftId;
}
