package com.presenza.backend.controller;

import com.presenza.backend.dto.request.AddMemberRequest;
import com.presenza.backend.dto.request.BulkImportRequest;
import com.presenza.backend.dto.request.UpdateMemberRequest;
import com.presenza.backend.dto.response.BulkImportResult;
import com.presenza.backend.dto.response.MemberResponse;
import com.presenza.backend.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ORGANIZATION','MANAGER')")
public class MemberController {

    private final MemberService memberService;

    @GetMapping
    public List<MemberResponse> list() {
        return memberService.list();
    }

    @PostMapping
    public MemberResponse add(@Valid @RequestBody AddMemberRequest req) {
        return memberService.add(req);
    }

    @PatchMapping("/{id}")
    public MemberResponse update(@PathVariable Long id, @RequestBody UpdateMemberRequest req) {
        return memberService.update(id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        memberService.delete(id);
    }

    @PostMapping("/import")
    public BulkImportResult bulkImport(@RequestBody BulkImportRequest req) {
        return memberService.bulkImport(req.getCsv());
    }
}
