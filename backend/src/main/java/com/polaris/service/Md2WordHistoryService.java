package com.polaris.service;

import com.polaris.dto.document.Md2WordHistoryResponse;
import com.polaris.dto.document.Md2WordHistoryRenameRequest;
import com.polaris.dto.document.Md2WordHistoryUpsertRequest;

import java.util.List;

public interface Md2WordHistoryService {

    List<Md2WordHistoryResponse> listCurrentUserHistory(String search);

    Md2WordHistoryResponse saveCurrentUserHistory(Md2WordHistoryUpsertRequest request);

    Md2WordHistoryResponse renameCurrentUserHistory(Long id, Md2WordHistoryRenameRequest request);

    void deleteCurrentUserHistory(Long id);
}
