from mastodon import Mastodon
from django.conf import settings
import logging

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
    
    def post_status(self, content, visibility='public'):
        """Post a status to Mastodon"""
        if not self.mastodon:
            raise Exception("Mastodon API client not initialized")
        
        try:
            response = self.mastodon.status_post(
                status=content,
                visibility=visibility
            )
            logger.info(f"Successfully posted status: {response['id']}")
            return {
                'success': True,
                'post_id': response['id'],
                'url': response['url'],
                'created_at': response['created_at']
            }
        except Exception as e:
            logger.error(f"Failed to post status: {e}")
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