CREATE TABLE IF NOT EXISTS t_md2word_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    client_file_id VARCHAR(64) NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    content LONGTEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    preview_text VARCHAR(255) NULL,
    word_count BIGINT NOT NULL DEFAULT 0,
    char_count BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_md2word_history_user_file (user_id, client_file_id, deleted),
    KEY idx_md2word_history_user_updated (user_id, updated_at DESC),
    KEY idx_md2word_history_user_deleted (user_id, deleted)
);
