from mastodon import Mastodon
from django.conf import settings
import logging
import os
import tempfile

logger = logging.getLogger(__name__)

class MastodonService:
    def __init__(self):
        self.mastodon = None
        self._initialize_mastodon()
    
    def _initialize_mastodon(self):
        """Initialize Mastodon API client with credentials from settings"""
        try:
            self.mastodon = Mastodon(
                client_id=settings.MASTODON_CLIENT_ID,
                client_secret=settings.MASTODON_CLIENT_SECRET,
                access_token=settings.MASTODON_ACCESS_TOKEN,
                api_base_url=settings.MASTODON_INSTANCE_URL
            )
            logger.info("Mastodon API client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Mastodon API client: {e}")
            self.mastodon = None
    
    def _validate_media_file(self, file_path, file_type):
        """Simple file validation without magic library"""
        # Mastodon limits (approximate)
        MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB for images
        MAX_VIDEO_SIZE = 40 * 1024 * 1024  # 40MB for videos
        
        SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        SUPPORTED_VIDEO_FORMATS = ['.mp4', '.mov', '.webm', '.m4v']
        
        file_size = os.path.getsize(file_path)
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_type == 'image':
            if file_ext not in SUPPORTED_IMAGE_FORMATS:
                return False, f"Unsupported image format: {file_ext}"
            if file_size > MAX_IMAGE_SIZE:
                return False, f"Image too large: {file_size / (1024*1024):.1f}MB (max 10MB)"
        elif file_type == 'video':
            if file_ext not in SUPPORTED_VIDEO_FORMATS:
                return False, f"Unsupported video format: {file_ext}"
            if file_size > MAX_VIDEO_SIZE:
                return False, f"Video too large: {file_size / (1024*1024):.1f}MB (max 40MB)"
        
        return True, "Valid file"
    
    def _upload_media(self, file_path, alt_text=None):
        """Upload a single media file to Mastodon"""
        if not self.mastodon:
            raise Exception("Mastodon API client not initialized")
        
        try:
            # Determine file type
            file_ext = os.path.splitext(file_path)[1].lower()
            if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                file_type = 'image'
            elif file_ext in ['.mp4', '.mov', '.webm', '.m4v']:
                file_type = 'video'
            else:
                raise Exception(f"Unsupported file format: {file_ext}")
            
            # Validate file
            is_valid, message = self._validate_media_file(file_path, file_type)
            if not is_valid:
                raise Exception(message)
            
            # Upload to Mastodon
            media_dict = self.mastodon.media_post(
                media_file=file_path,
                description=alt_text
            )
            
            logger.info(f"Successfully uploaded media: {media_dict['id']}")
            return {
                'success': True,
                'media_id': media_dict['id'],
                'type': media_dict['type'],
                'url': media_dict.get('url', ''),
                'preview_url': media_dict.get('preview_url', '')
            }
            
        except Exception as e:
            logger.error(f"Failed to upload media: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def post_status(self, content, visibility='public', media_files=None, alt_texts=None):
        """Post a status to Mastodon with optional media attachments"""
        if not self.mastodon:
            raise Exception("Mastodon API client not initialized")
        
        media_ids = []
        
        try:
            # Handle media uploads if provided
            if media_files:
                if len(media_files) > 4:
                    return {
                        'success': False,
                        'error': 'Maximum 4 media files allowed per post'
                    }
                
                # Check for mixed media types (images + videos not allowed)
                file_types = set()
                for file_path in media_files:
                    file_ext = os.path.splitext(file_path)[1].lower()
                    if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                        file_types.add('image')
                    elif file_ext in ['.mp4', '.mov', '.webm', '.m4v']:
                        file_types.add('video')
                
                if len(file_types) > 1:
                    return {
                        'success': False,
                        'error': 'Cannot mix images and videos in the same post'
                    }
                
                if 'video' in file_types and len(media_files) > 1:
                    return {
                        'success': False,
                        'error': 'Only one video file allowed per post'
                    }
                
                # Upload each media file
                for i, file_path in enumerate(media_files):
                    alt_text = alt_texts[i] if alt_texts and i < len(alt_texts) else None
                    media_result = self._upload_media(file_path, alt_text)
                    
                    if not media_result['success']:
                        return media_result
                    
                    media_ids.append(media_result['media_id'])
            
            # Post status with media
            response = self.mastodon.status_post(
                status=content,
                visibility=visibility,
                media_ids=media_ids if media_ids else None
            )
            
            logger.info(f"Successfully posted status with media: {response['id']}")
            return {
                'success': True,
                'post_id': response['id'],
                'url': response['url'],
                'created_at': response['created_at'],
                'media_count': len(media_ids)
            }
            
        except Exception as e:
            logger.error(f"Failed to post status with media: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_account_info(self):
        """Get current account information"""
        if not self.mastodon:
            raise Exception("Mastodon API client not initialized")
        
        try:
            account = self.mastodon.me()
            return {
                'success': True,
                'username': account['username'],
                'display_name': account['display_name'],
                'followers_count': account['followers_count'],
                'following_count': account['following_count']
            }
        except Exception as e:
            logger.error(f"Failed to get account info: {e}")
            return {
                'success': False,
                'error': str(e)
            }