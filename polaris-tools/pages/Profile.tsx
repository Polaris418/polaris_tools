import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { AvatarEditor } from '../components/AvatarEditor';
import { AVATAR_STYLES } from '../components/AvatarStylePicker';
import { ProfileInfoSection } from '../components/ProfileInfoSection';
import { createAvatar } from '@dicebear/core';
import { lorelei } from '@dicebear/collection';
import { validateForm } from '../utils/formValidation';
import { apiClient } from '../api/client';
import { encodeSvgToDataUri } from '../utils/encoding';

export const Profile: React.FC = () => {
  const { user, showToast, refreshUser } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState('lorelei');
  const [avatarConfig, setAvatarConfig] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    nickname: '',
    bio: '',
  });
  const [errors, setErrors] = useState<{
    nickname?: string;
    bio?: string;
  }>({});

  // 生成头像 SVG - 使用 useMemo 缓存，添加错误处理
  const avatarSvg = useMemo(() => {
    try {
      if (!user) return '';
      
      const styleConfig = AVATAR_STYLES.find(s => s.id === selectedAvatarStyle);
      const style = styleConfig?.style || lorelei;
      
      // 使用保存的 seed，如果没有则使用用户名
      const seed = avatarConfig.seed || user.username;
      
      // @ts-ignore - Spread avatarConfig to apply custom options
      const avatar = createAvatar(style, {
        seed,
        size: 128,
        ...avatarConfig,
      });
      
      return avatar.toString();
    } catch (error) {
      console.error('Avatar generation error:', {
        user: user?.username,
        timestamp: new Date().toISOString(),
        selectedStyle: selectedAvatarStyle,
        config: avatarConfig,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="#e2e8f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#64748b" font-size="48" font-family="sans-serif">?</text></svg>';
    }
  }, [user, selectedAvatarStyle, avatarConfig]);

  const avatarDataUri = useMemo(() => {
    return encodeSvgToDataUri(avatarSvg);
  }, [avatarSvg]);

  const handleEnterEditMode = useCallback(() => {
    setEditForm({
      nickname: user?.nickname || user?.username || '',
      bio: user?.bio || '',
    });
    setErrors({});
    setIsEditing(true);
  }, [user]);

  const handleCancelEdit = useCallback(() => {
    setEditForm({
      nickname: '',
      bio: '',
    });
    setErrors({});
    setIsEditing(false);
  }, []);

  const handleFormChange = useCallback((field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      if (prev[field as keyof typeof prev]) {
        return { ...prev, [field]: undefined };
      }
      return prev;
    });
  }, []);

  const handleSaveProfile = useCallback(async () => {
    try {
      const validationErrors = validateForm(editForm);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      
      setIsSubmitting(true);
      
      const response = await apiClient.user.updateProfile({
        nickname: editForm.nickname,
        email: user?.email || '', // Keep current email
        bio: editForm.bio,
        avatarStyle: selectedAvatarStyle,
        avatarConfig: JSON.stringify(avatarConfig),
      });
      
      if (response.code === 200) {
        await refreshUser();
        showToast(t('profile.update_success'), 'success');
        setIsEditing(false);
        setEditForm({
          nickname: '',
          bio: '',
        });
        setErrors({});
      }
    } catch (error: any) {
      console.error('Profile update error:', {
        user: user?.username,
        timestamp: new Date().toISOString(),
        error: error.message,
        code: error.code,
        stack: error.stack,
      });
      
      if (error.code === 400) {
        showToast(t('profile.form.invalid'), 'error');
      } else if (error.code === 401) {
        showToast(t('profile.session_expired'), 'error');
      } else if (error.code === 0) {
        showToast(t('profile.network_error'), 'error');
      } else {
        showToast(t('profile.update_failed'), 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [editForm, selectedAvatarStyle, avatarConfig, user, refreshUser, showToast]);

  const handleAvatarSave = useCallback(async (styleId: string, config: Record<string, any>) => {
    try {
      setIsSubmitting(true);
      
      // 直接保存到数据库
      const response = await apiClient.user.updateProfile({
        nickname: user?.nickname || user?.username || '',
        email: user?.email || '',
        bio: user?.bio || '',
        avatarStyle: styleId,
        avatarConfig: JSON.stringify(config),
      });
      
      if (response.code === 200) {
        // 更新本地状态
        setSelectedAvatarStyle(styleId);
        setAvatarConfig(config);
        
        // 刷新用户信息
        await refreshUser();
        showToast(t('profile.avatar_updated'), 'success');
      }
    } catch (error: any) {
      console.error('Avatar update error:', error);
      showToast(t('profile.avatar_update_failed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, refreshUser, showToast]);

  const handleOpenAvatarEditor = useCallback(() => {
    setShowAvatarEditor(true);
  }, []);

  const handleCloseAvatarEditor = useCallback(() => {
    setShowAvatarEditor(false);
  }, []);

  useEffect(() => {
    if (user?.avatar && AVATAR_STYLES.some(s => s.id === user.avatar)) {
      setSelectedAvatarStyle(user.avatar);
    } else {
      setSelectedAvatarStyle('lorelei');
    }
    
    // Parse avatarConfig from user data
    if (user?.avatarConfig) {
      try {
        const parsedConfig = JSON.parse(user.avatarConfig);
        setAvatarConfig(parsedConfig);
      } catch (error) {
        console.error('Failed to parse avatarConfig:', error);
        setAvatarConfig({});
      }
    } else {
      setAvatarConfig({});
    }
  }, [user?.avatar, user?.avatarConfig]);

  if (!user) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="max-w-5xl mx-auto text-center py-12 md:py-16 lg:py-20">
          <Icon name="person_off" className="text-4xl md:text-5xl lg:text-6xl text-slate-400 mb-3 md:mb-4" />
          <p className="text-sm md:text-base text-slate-500 dark:text-text-secondary">请先登录查看个人资料</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-xl md:rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark overflow-hidden mb-6 md:mb-8 shadow-sm">
          <div className="h-24 md:h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          <div className="px-4 md:px-6 lg:px-8 pb-6 md:pb-8">
            <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-end -mt-10 md:-mt-12 mb-4 md:mb-6 gap-4 sm:gap-0">
              <div className="relative group">
                <div 
                  key={selectedAvatarStyle}
                  className={`size-20 md:size-24 lg:size-28 rounded-full border-4 border-white dark:border-surface-dark bg-slate-200 bg-cover bg-center transition-all duration-300 ease-in-out animate-fade-in ${
                    isEditing ? 'cursor-pointer hover:scale-110 hover:shadow-xl' : ''
                  }`}
                  style={{ backgroundImage: `url("${avatarDataUri}")` }}
                  onClick={isEditing ? handleOpenAvatarEditor : undefined}
                  title={isEditing ? "点击自定义头像" : ""}
                >
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out flex items-center justify-center">
                      <Icon name="photo_camera" className="text-white text-xl md:text-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0.5 md:bottom-1 right-0.5 md:right-1 size-4 md:size-5 bg-green-500 dark:bg-green-400 border-2 border-white dark:border-surface-dark rounded-full" title="在线"></div>
              </div>
              
              {!isEditing ? (
                <button 
                  onClick={handleEnterEditMode}
                  className="w-full sm:w-auto px-4 py-2.5 md:py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 hover:shadow-lg transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Icon name="edit" className="text-[18px]" />
                  {t('profile.edit')}
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button 
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-4 py-2.5 md:py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none min-h-[44px]"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-4 py-2.5 md:py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 hover:shadow-lg text-white text-sm font-semibold rounded-lg transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none min-h-[44px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Icon name="hourglass_empty" className="text-[18px] animate-spin" />
                        {t('profile.saving')}
                      </>
                    ) : (
                      <>
                        <Icon name="save" className="text-[18px]" />
                        {t('profile.save')}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            
            <div className="transition-all duration-300 ease-in-out">
              <ProfileInfoSection
                user={user}
                isEditing={isEditing}
                editForm={editForm}
                errors={errors}
                onFormChange={handleFormChange}
                onSave={handleSaveProfile}
                onCancel={handleCancelEdit}
                onEdit={handleEnterEditMode}
                onShowToast={showToast}
                onRefreshUser={refreshUser}
              />
            </div>
          </div>
        </div>

        <AvatarEditor
          isOpen={showAvatarEditor}
          username={user.username}
          currentStyle={selectedAvatarStyle}
          currentConfig={avatarConfig}
          onSave={handleAvatarSave}
          onClose={handleCloseAvatarEditor}
        />
      </div>
    </main>
  );
};
