package com.polaris.service;

import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.auth.security.UserContext;
import com.polaris.dto.document.Md2WordHistoryRenameRequest;
import com.polaris.dto.document.Md2WordHistoryResponse;
import com.polaris.dto.document.Md2WordHistoryUpsertRequest;
import com.polaris.entity.Md2WordHistory;
import com.polaris.entity.User;
import com.polaris.mapper.Md2WordHistoryMapper;
import com.polaris.mapper.UserMapper;
import com.polaris.service.impl.Md2WordHistoryServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("md2word 历史记录服务测试")
class Md2WordHistoryServiceTest {

    @Mock
    private Md2WordHistoryMapper historyMapper;

    @Mock
    private UserMapper userMapper;

    @Mock
    private UserContext userContext;

    private Md2WordHistoryServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new Md2WordHistoryServiceImpl(historyMapper, userMapper, userContext);
    }

    @Test
    @DisplayName("普通用户保存历史后应裁剪到最近 5 条")
    void shouldTrimHistoryForFreeUser() {
        when(userContext.getCurrentUserId()).thenReturn(1L);
        User user = new User();
        user.setId(1L);
        user.setPlanType(0);
        when(userMapper.selectById(1L)).thenReturn(user);

        Md2WordHistoryUpsertRequest request = new Md2WordHistoryUpsertRequest();
        request.setClientFileId("file-1");
        request.setDocumentName("Untitled.md");
        request.setContent("# 标题");

        when(historyMapper.selectOne(any())).thenReturn(null);
        when(historyMapper.selectList(any())).thenReturn(buildHistoryList(7));
        mockInsertGeneratedId();
        when(historyMapper.selectById(1L)).thenReturn(buildHistory(1L, "file-1", "Untitled.md", "# 标题"));

        service.saveCurrentUserHistory(request);

        verify(historyMapper).insert(any(Md2WordHistory.class));
        verify(historyMapper).hardDeleteById(6L);
        verify(historyMapper).hardDeleteById(7L);
    }

    @Test
    @DisplayName("订阅用户保存历史时不应触发 5 条裁剪")
    void shouldNotTrimHistoryForSubscribedUser() {
        when(userContext.getCurrentUserId()).thenReturn(1L);
        User user = new User();
        user.setId(1L);
        user.setPlanType(1);
        when(userMapper.selectById(1L)).thenReturn(user);

        Md2WordHistoryUpsertRequest request = new Md2WordHistoryUpsertRequest();
        request.setClientFileId("file-1");
        request.setDocumentName("Untitled.md");
        request.setContent("# 标题");

        when(historyMapper.selectOne(any())).thenReturn(null);
        mockInsertGeneratedId();
        when(historyMapper.selectById(1L)).thenReturn(buildHistory(1L, "file-1", "Untitled.md", "# 标题"));

        service.saveCurrentUserHistory(request);

        verify(historyMapper).insert(any(Md2WordHistory.class));
        verify(historyMapper, never()).selectList(any());
        verify(historyMapper, never()).deleteById((Long) any());
    }

    @Test
    @DisplayName("保存历史时应写入预览摘要和统计信息")
    void shouldPersistPreviewAndStats() {
        when(userContext.getCurrentUserId()).thenReturn(1L);
        User user = new User();
        user.setId(1L);
        user.setPlanType(0);
        when(userMapper.selectById(1L)).thenReturn(user);

        Md2WordHistoryUpsertRequest request = new Md2WordHistoryUpsertRequest();
        request.setClientFileId("file-1");
        request.setDocumentName("Untitled.md");
        request.setContent("# 标题\n\n第一段 内容");

        when(historyMapper.selectOne(any())).thenReturn(null);
        when(historyMapper.selectList(any())).thenReturn(List.of());
        mockInsertGeneratedId();
        when(historyMapper.selectById(1L)).thenReturn(buildHistory(1L, "file-1", "Untitled.md", "# 标题\n\n第一段 内容"));

        service.saveCurrentUserHistory(request);

        ArgumentCaptor<Md2WordHistory> captor = ArgumentCaptor.forClass(Md2WordHistory.class);
        verify(historyMapper).insert(captor.capture());
        Md2WordHistory saved = captor.getValue();
        assertEquals("file-1", saved.getClientFileId());
        assertEquals("Untitled.md", saved.getDocumentName());
        assertEquals((long) request.getContent().length(), saved.getCharCount());
        assertNotNull(saved.getContentHash());
        assertNotNull(saved.getPreviewText());
    }

    @Test
    @DisplayName("搜索历史时应按文档名或预览文本模糊过滤")
    void shouldFilterHistoryBySearchKeyword() {
        when(userContext.getCurrentUserId()).thenReturn(1L);
        List<Md2WordHistory> histories = new ArrayList<>();
        histories.add(buildHistory(1L, "file-1", "Doc 1", "preview text"));
        when(historyMapper.selectList(any())).thenReturn(histories);

        List<Md2WordHistoryResponse> results = service.listCurrentUserHistory("preview");

        assertEquals(1, results.size());
        assertEquals("Doc 1", results.get(0).getDocumentName());
        verify(historyMapper).selectList(any());
    }

    @Test
    @DisplayName("登录用户可以重命名自己的历史记录")
    void shouldRenameOwnedHistory() {
        when(userContext.getCurrentUserId()).thenReturn(1L);
        Md2WordHistory history = buildHistory(1L, "file-1", "Old Name.md", "# 标题");
        when(historyMapper.selectById(1L)).thenReturn(history);
        when(historyMapper.updateById(any())).thenReturn(1);
        when(historyMapper.selectById(1L)).thenReturn(buildHistory(1L, "file-1", "New Name.md", "# 标题"));

        Md2WordHistoryRenameRequest request = new Md2WordHistoryRenameRequest();
        request.setDocumentName("New Name.md");

        Md2WordHistoryResponse response = service.renameCurrentUserHistory(1L, request);

        assertEquals("New Name.md", response.getDocumentName());
        verify(historyMapper).updateById(any(Md2WordHistory.class));
    }

    @Test
    @DisplayName("非本人历史记录不能删除")
    void shouldRejectDeletingOtherUsersHistory() {
        when(userContext.getCurrentUserId()).thenReturn(1L);
        Md2WordHistory history = buildHistory(1L, "file-1", "Doc 1", "# 标题");
        history.setUserId(2L);
        when(historyMapper.selectById(1L)).thenReturn(history);

        BusinessException exception = assertThrows(BusinessException.class, () -> service.deleteCurrentUserHistory(1L));

        assertEquals(ErrorCode.NOT_FOUND.getCode(), exception.getCode());
        verify(historyMapper, never()).deleteById(eq(1L));
    }

    private List<Md2WordHistory> buildHistoryList(int count) {
        return java.util.stream.LongStream.rangeClosed(1, count)
                .mapToObj(index -> buildHistory(index, "file-" + index, "Doc " + index, "content-" + index))
                .toList();
    }

    private Md2WordHistory buildHistory(Long id, String clientFileId, String name, String content) {
        Md2WordHistory history = new Md2WordHistory();
        history.setId(id);
        history.setUserId(1L);
        history.setClientFileId(clientFileId);
        history.setDocumentName(name);
        history.setContent(content);
        history.setPreviewText(content);
        history.setCharCount((long) content.length());
        history.setWordCount((long) content.trim().split("\\s+").length);
        history.setUpdatedAt(LocalDateTime.now());
        return history;
    }

    private void mockInsertGeneratedId() {
        doAnswer(invocation -> {
            Md2WordHistory history = invocation.getArgument(0);
            history.setId(1L);
            return 1;
        }).when(historyMapper).insert(any(Md2WordHistory.class));
    }
}
