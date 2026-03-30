package com.polaris.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.polaris.auth.security.UserContext;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.dto.document.Md2WordHistoryRenameRequest;
import com.polaris.dto.document.Md2WordHistoryResponse;
import com.polaris.dto.document.Md2WordHistoryUpsertRequest;
import com.polaris.entity.Md2WordHistory;
import com.polaris.entity.User;
import com.polaris.mapper.Md2WordHistoryMapper;
import com.polaris.mapper.UserMapper;
import com.polaris.service.Md2WordHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
public class Md2WordHistoryServiceImpl implements Md2WordHistoryService {

    private static final int FREE_USER_HISTORY_LIMIT = 5;

    private final Md2WordHistoryMapper historyMapper;
    private final UserMapper userMapper;
    private final UserContext userContext;

    @Override
    public List<Md2WordHistoryResponse> listCurrentUserHistory(String search) {
        Long userId = requireCurrentUserId();
        LambdaQueryWrapper<Md2WordHistory> queryWrapper = new LambdaQueryWrapper<Md2WordHistory>()
                .eq(Md2WordHistory::getUserId, userId);

        if (StringUtils.hasText(search)) {
            String keyword = search.trim();
            queryWrapper.and(wrapper -> wrapper
                    .like(Md2WordHistory::getDocumentName, keyword)
                    .or()
                    .like(Md2WordHistory::getPreviewText, keyword));
        }

        return historyMapper.selectList(queryWrapper.orderByDesc(Md2WordHistory::getUpdatedAt))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Md2WordHistoryResponse saveCurrentUserHistory(Md2WordHistoryUpsertRequest request) {
        Long userId = requireCurrentUserId();
        User user = requireCurrentUser(userId);
        String content = request.getContent() == null ? "" : request.getContent();

        Md2WordHistory history = historyMapper.selectOne(new LambdaQueryWrapper<Md2WordHistory>()
                .eq(Md2WordHistory::getUserId, userId)
                .eq(Md2WordHistory::getClientFileId, request.getClientFileId())
                .last("LIMIT 1"));

        if (history == null) {
            history = new Md2WordHistory();
            history.setUserId(userId);
            history.setClientFileId(request.getClientFileId());
        }

        history.setDocumentName(request.getDocumentName());
        history.setContent(content);
        history.setContentHash(calculateContentHash(content));
        history.setPreviewText(buildPreviewText(content));
        history.setWordCount(countWords(content));
        history.setCharCount((long) content.length());
        history.setUpdatedAt(LocalDateTime.now());

        if (history.getId() == null) {
            historyMapper.insert(history);
        } else {
            historyMapper.updateById(history);
        }

        trimFreeUserHistoryIfNeeded(userId, user.getPlanType());
        return toResponse(historyMapper.selectById(history.getId()));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Md2WordHistoryResponse renameCurrentUserHistory(Long id, Md2WordHistoryRenameRequest request) {
        Long userId = requireCurrentUserId();
        Md2WordHistory history = requireOwnedHistory(id, userId);
        history.setDocumentName(request.getDocumentName().trim());
        history.setUpdatedAt(LocalDateTime.now());
        historyMapper.updateById(history);
        return toResponse(historyMapper.selectById(id));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteCurrentUserHistory(Long id) {
        Long userId = requireCurrentUserId();
        requireOwnedHistory(id, userId);
        historyMapper.hardDeleteByIdAndUserId(id, userId);
    }

    private Long requireCurrentUserId() {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return userId;
    }

    private User requireCurrentUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }

    private Md2WordHistory requireOwnedHistory(Long id, Long userId) {
        Md2WordHistory history = historyMapper.selectById(id);
        if (history == null || !userId.equals(history.getUserId())) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "历史记录不存在");
        }
        return history;
    }

    private void trimFreeUserHistoryIfNeeded(Long userId, Integer planType) {
        if (planType != null && planType > 0) {
            return;
        }

        List<Md2WordHistory> historyList = historyMapper.selectList(new LambdaQueryWrapper<Md2WordHistory>()
                .eq(Md2WordHistory::getUserId, userId)
                .orderByDesc(Md2WordHistory::getUpdatedAt));

        if (historyList.size() <= FREE_USER_HISTORY_LIMIT) {
            return;
        }

        historyList.stream()
                .skip(FREE_USER_HISTORY_LIMIT)
                .map(Md2WordHistory::getId)
                .forEach(historyMapper::hardDeleteById);
    }

    private Md2WordHistoryResponse toResponse(Md2WordHistory history) {
        Md2WordHistoryResponse response = new Md2WordHistoryResponse();
        response.setId(history.getId());
        response.setClientFileId(history.getClientFileId());
        response.setDocumentName(history.getDocumentName());
        response.setContent(history.getContent());
        response.setPreviewText(history.getPreviewText());
        response.setWordCount(history.getWordCount());
        response.setCharCount(history.getCharCount());
        response.setUpdatedAt(history.getUpdatedAt());
        return response;
    }

    private String buildPreviewText(String content) {
        String normalized = content
                .replace("\r", " ")
                .replace("\n", " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (normalized.length() <= 120) {
            return normalized;
        }
        return normalized.substring(0, 120);
    }

    private Long countWords(String content) {
        String trimmed = content == null ? "" : content.trim();
        if (trimmed.isEmpty()) {
            return 0L;
        }
        return (long) trimmed.split("\\s+").length;
    }

    private String calculateContentHash(String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 不可用", exception);
        }
    }
}
