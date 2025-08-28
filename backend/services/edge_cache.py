"""
L3 Edge Cache Implementation - CDN and Static Resource Optimization
智阅3.0多层缓存架构 - 边缘缓存层
"""

import asyncio
import hashlib
import json
import mimetypes
import os
import time
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
from typing import Optional, Dict, List, Any, Union, Tuple
from urllib.parse import urlparse
import aiofiles
import aiohttp
from datetime import datetime, timedelta
import logging
from collections import defaultdict
import gzip
import brotli

logger = logging.getLogger(__name__)

class ResourceType(str, Enum):
    """静态资源类型"""
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    FONT = "font"
    CSS = "css"
    JS = "js"
    JSON = "json"
    OTHER = "other"

class CompressionType(str, Enum):
    """压缩类型"""
    NONE = "none"
    GZIP = "gzip"
    BROTLI = "brotli"

@dataclass
class CacheEntry:
    """缓存条目"""
    url: str
    file_path: str
    content_type: str
    content_length: int
    etag: str
    last_modified: str
    expires: datetime
    resource_type: ResourceType
    compression: CompressionType
    hit_count: int = 0
    last_accessed: datetime = None
    created_at: datetime = None
    
    def __post_init__(self):
        if self.last_accessed is None:
            self.last_accessed = datetime.now()
        if self.created_at is None:
            self.created_at = datetime.now()

class CDNProvider(str, Enum):
    """CDN提供商"""
    CLOUDFLARE = "cloudflare"
    ALIYUN = "aliyun"
    QCLOUD = "qcloud"
    LOCAL = "local"

@dataclass
class CDNConfig:
    """CDN配置"""
    provider: CDNProvider
    endpoint: str
    access_key: Optional[str] = None
    secret_key: Optional[str] = None
    bucket: Optional[str] = None
    region: Optional[str] = None
    custom_domain: Optional[str] = None
    
class EdgeCache:
    """边缘缓存管理器"""
    
    def __init__(
        self,
        cache_dir: str = "./cache/edge",
        max_size_gb: float = 10.0,
        max_file_size_mb: float = 100.0,
        default_ttl: int = 86400,  # 24小时
        cdn_config: Optional[CDNConfig] = None
    ):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.max_size_bytes = int(max_size_gb * 1024 * 1024 * 1024)
        self.max_file_size_bytes = int(max_file_size_mb * 1024 * 1024)
        self.default_ttl = default_ttl
        self.cdn_config = cdn_config
        
        # 缓存元数据
        self.cache_index: Dict[str, CacheEntry] = {}
        self.size_by_type: Dict[ResourceType, int] = defaultdict(int)
        self.total_size = 0
        
        # 性能统计
        self.stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "compression_savings": 0,
            "total_requests": 0
        }
        
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={"User-Agent": "ZhiYue3.0-EdgeCache/1.0"}
        )
        await self._load_cache_index()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
        await self._save_cache_index()
        
    def _get_resource_type(self, url: str, content_type: str) -> ResourceType:
        """根据URL和Content-Type确定资源类型"""
        if content_type:
            if content_type.startswith("image/"):
                return ResourceType.IMAGE
            elif content_type.startswith("video/"):
                return ResourceType.VIDEO
            elif content_type.startswith("text/css"):
                return ResourceType.CSS
            elif content_type.startswith("application/javascript"):
                return ResourceType.JS
            elif content_type.startswith("application/json"):
                return ResourceType.JSON
            elif content_type.startswith("font/") or "font" in content_type:
                return ResourceType.FONT
            elif content_type.startswith("application/pdf"):
                return ResourceType.DOCUMENT
                
        # 基于文件扩展名
        url_path = urlparse(url).path.lower()
        if any(url_path.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']):
            return ResourceType.IMAGE
        elif any(url_path.endswith(ext) for ext in ['.mp4', '.webm', '.mov']):
            return ResourceType.VIDEO
        elif url_path.endswith('.css'):
            return ResourceType.CSS
        elif any(url_path.endswith(ext) for ext in ['.js', '.mjs']):
            return ResourceType.JS
        elif url_path.endswith('.json'):
            return ResourceType.JSON
        elif any(url_path.endswith(ext) for ext in ['.woff', '.woff2', '.ttf', '.eot']):
            return ResourceType.FONT
        elif any(url_path.endswith(ext) for ext in ['.pdf', '.doc', '.docx']):
            return ResourceType.DOCUMENT
            
        return ResourceType.OTHER
        
    def _should_compress(self, resource_type: ResourceType, content_length: int) -> CompressionType:
        """确定是否应该压缩以及压缩方式"""
        # 图片和视频通常已经压缩，不需要再压缩
        if resource_type in [ResourceType.IMAGE, ResourceType.VIDEO]:
            return CompressionType.NONE
            
        # 小文件不压缩
        if content_length < 1024:
            return CompressionType.NONE
            
        # 文本类型优先使用Brotli
        if resource_type in [ResourceType.CSS, ResourceType.JS, ResourceType.JSON]:
            return CompressionType.BROTLI
            
        return CompressionType.GZIP
        
    def _compress_content(self, content: bytes, compression: CompressionType) -> bytes:
        """压缩内容"""
        if compression == CompressionType.GZIP:
            return gzip.compress(content, compresslevel=6)
        elif compression == CompressionType.BROTLI:
            return brotli.compress(content, quality=6)
        return content
        
    def _decompress_content(self, content: bytes, compression: CompressionType) -> bytes:
        """解压内容"""
        if compression == CompressionType.GZIP:
            return gzip.decompress(content)
        elif compression == CompressionType.BROTLI:
            return brotli.decompress(content)
        return content
        
    def _get_cache_key(self, url: str) -> str:
        """生成缓存键"""
        return hashlib.sha256(url.encode()).hexdigest()
        
    def _get_cache_path(self, cache_key: str, compression: CompressionType) -> Path:
        """获取缓存文件路径"""
        # 使用前两位作为子目录，避免单目录文件过多
        subdir = cache_key[:2]
        cache_subdir = self.cache_dir / subdir
        cache_subdir.mkdir(exist_ok=True)
        
        suffix = ""
        if compression == CompressionType.GZIP:
            suffix = ".gz"
        elif compression == CompressionType.BROTLI:
            suffix = ".br"
            
        return cache_subdir / f"{cache_key}{suffix}"
        
    async def _fetch_resource(self, url: str) -> Optional[Tuple[bytes, Dict[str, str]]]:
        """从源服务器获取资源"""
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    content = await response.read()
                    headers = dict(response.headers)
                    return content, headers
                else:
                    logger.warning(f"Failed to fetch {url}: HTTP {response.status}")
                    return None
        except Exception as e:
            logger.error(f"Error fetching {url}: {str(e)}")
            return None
            
    async def _evict_lru_entries(self, required_space: int):
        """基于LRU策略清理缓存"""
        # 按最后访问时间排序
        entries_by_access = sorted(
            self.cache_index.values(),
            key=lambda x: x.last_accessed
        )
        
        freed_space = 0
        for entry in entries_by_access:
            if freed_space >= required_space:
                break
                
            await self._remove_cache_entry(entry.url)
            freed_space += entry.content_length
            self.stats["evictions"] += 1
            
        logger.info(f"Evicted entries, freed {freed_space} bytes")
        
    async def _remove_cache_entry(self, url: str):
        """删除缓存条目"""
        cache_key = self._get_cache_key(url)
        if cache_key in self.cache_index:
            entry = self.cache_index[cache_key]
            
            # 删除文件
            cache_path = Path(entry.file_path)
            if cache_path.exists():
                cache_path.unlink()
                
            # 更新统计
            self.total_size -= entry.content_length
            self.size_by_type[entry.resource_type] -= entry.content_length
            
            # 从索引中移除
            del self.cache_index[cache_key]
            
    async def get(self, url: str, force_refresh: bool = False) -> Optional[bytes]:
        """获取资源"""
        self.stats["total_requests"] += 1
        cache_key = self._get_cache_key(url)
        
        # 检查缓存
        if not force_refresh and cache_key in self.cache_index:
            entry = self.cache_index[cache_key]
            
            # 检查过期
            if datetime.now() < entry.expires:
                # 缓存命中
                try:
                    async with aiofiles.open(entry.file_path, 'rb') as f:
                        compressed_content = await f.read()
                        content = self._decompress_content(compressed_content, entry.compression)
                        
                    # 更新统计
                    entry.hit_count += 1
                    entry.last_accessed = datetime.now()
                    self.stats["hits"] += 1
                    
                    return content
                except Exception as e:
                    logger.error(f"Error reading cache file {entry.file_path}: {str(e)}")
                    await self._remove_cache_entry(url)
            else:
                # 缓存过期
                await self._remove_cache_entry(url)
                
        # 缓存未命中，从源获取
        self.stats["misses"] += 1
        result = await self._fetch_resource(url)
        if result is None:
            return None
            
        content, headers = result
        
        # 检查文件大小限制
        if len(content) > self.max_file_size_bytes:
            logger.warning(f"File too large to cache: {url} ({len(content)} bytes)")
            return content
            
        # 确定压缩方式
        content_type = headers.get('content-type', '')
        resource_type = self._get_resource_type(url, content_type)
        compression = self._should_compress(resource_type, len(content))
        
        # 压缩内容
        compressed_content = self._compress_content(content, compression)
        compression_savings = len(content) - len(compressed_content)
        self.stats["compression_savings"] += compression_savings
        
        # 检查缓存空间
        required_space = len(compressed_content)
        if self.total_size + required_space > self.max_size_bytes:
            await self._evict_lru_entries(required_space)
            
        # 保存到缓存
        cache_path = self._get_cache_path(cache_key, compression)
        try:
            async with aiofiles.open(cache_path, 'wb') as f:
                await f.write(compressed_content)
                
            # 创建缓存条目
            entry = CacheEntry(
                url=url,
                file_path=str(cache_path),
                content_type=content_type,
                content_length=len(compressed_content),
                etag=headers.get('etag', ''),
                last_modified=headers.get('last-modified', ''),
                expires=datetime.now() + timedelta(seconds=self.default_ttl),
                resource_type=resource_type,
                compression=compression
            )
            
            # 更新索引和统计
            self.cache_index[cache_key] = entry
            self.total_size += len(compressed_content)
            self.size_by_type[resource_type] += len(compressed_content)
            
            logger.info(f"Cached {url} ({resource_type.value}, {compression.value}, {len(compressed_content)} bytes)")
            
        except Exception as e:
            logger.error(f"Error saving cache file {cache_path}: {str(e)}")
            
        return content
        
    async def prefetch(self, urls: List[str], max_concurrent: int = 5):
        """预取资源"""
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def prefetch_one(url: str):
            async with semaphore:
                try:
                    await self.get(url)
                    logger.info(f"Prefetched: {url}")
                except Exception as e:
                    logger.error(f"Error prefetching {url}: {str(e)}")
                    
        tasks = [prefetch_one(url) for url in urls]
        await asyncio.gather(*tasks, return_exceptions=True)
        
    async def invalidate(self, url_pattern: str = None):
        """缓存失效"""
        if url_pattern is None:
            # 清空所有缓存
            for entry in list(self.cache_index.values()):
                await self._remove_cache_entry(entry.url)
        else:
            # 按模式失效
            import re
            pattern = re.compile(url_pattern)
            for entry in list(self.cache_index.values()):
                if pattern.search(entry.url):
                    await self._remove_cache_entry(entry.url)
                    
    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计"""
        hit_rate = 0
        if self.stats["total_requests"] > 0:
            hit_rate = self.stats["hits"] / self.stats["total_requests"]
            
        return {
            "total_entries": len(self.cache_index),
            "total_size_mb": self.total_size / (1024 * 1024),
            "size_by_type": {
                k.value: v / (1024 * 1024) for k, v in self.size_by_type.items()
            },
            "hit_rate": hit_rate,
            "compression_savings_mb": self.stats["compression_savings"] / (1024 * 1024),
            **self.stats
        }
        
    async def _load_cache_index(self):
        """加载缓存索引"""
        index_file = self.cache_dir / "cache_index.json"
        if index_file.exists():
            try:
                async with aiofiles.open(index_file, 'r') as f:
                    content = await f.read()
                    data = json.loads(content)
                    
                for key, entry_data in data.items():
                    # 转换时间字段
                    for time_field in ['expires', 'last_accessed', 'created_at']:
                        if entry_data.get(time_field):
                            entry_data[time_field] = datetime.fromisoformat(entry_data[time_field])
                            
                    entry = CacheEntry(**entry_data)
                    
                    # 检查文件是否存在
                    if Path(entry.file_path).exists():
                        self.cache_index[key] = entry
                        self.total_size += entry.content_length
                        self.size_by_type[entry.resource_type] += entry.content_length
                        
                logger.info(f"Loaded cache index with {len(self.cache_index)} entries")
            except Exception as e:
                logger.error(f"Error loading cache index: {str(e)}")
                
    async def _save_cache_index(self):
        """保存缓存索引"""
        index_file = self.cache_dir / "cache_index.json"
        try:
            data = {}
            for key, entry in self.cache_index.items():
                entry_dict = asdict(entry)
                # 转换时间字段为字符串
                for time_field in ['expires', 'last_accessed', 'created_at']:
                    if entry_dict.get(time_field):
                        entry_dict[time_field] = entry_dict[time_field].isoformat()
                data[key] = entry_dict
                
            async with aiofiles.open(index_file, 'w') as f:
                await f.write(json.dumps(data, indent=2))
                
            logger.info("Saved cache index")
        except Exception as e:
            logger.error(f"Error saving cache index: {str(e)}")

class StaticResourceOptimizer:
    """静态资源优化器"""
    
    def __init__(self, static_dir: str = "./static"):
        self.static_dir = Path(static_dir)
        self.static_dir.mkdir(parents=True, exist_ok=True)
        
    async def optimize_images(self, source_dir: str, target_dir: str):
        """图片优化 - WebP转换和压缩"""
        try:
            from PIL import Image
            import pillow_heif  # 支持HEIF格式
            pillow_heif.register_heif_opener()
        except ImportError:
            logger.warning("PIL not available, skipping image optimization")
            return
            
        source_path = Path(source_dir)
        target_path = Path(target_dir)
        target_path.mkdir(parents=True, exist_ok=True)
        
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
        
        for image_file in source_path.rglob("*"):
            if image_file.suffix.lower() in image_extensions:
                try:
                    with Image.open(image_file) as img:
                        # 转换为WebP
                        relative_path = image_file.relative_to(source_path)
                        webp_path = target_path / relative_path.with_suffix('.webp')
                        webp_path.parent.mkdir(parents=True, exist_ok=True)
                        
                        # 保持原始质量但进行优化
                        img.save(webp_path, 'WEBP', optimize=True, quality=85)
                        
                        # 生成不同分辨率
                        for size, suffix in [(1920, '@2x'), (1280, '@1x'), (640, '@0.5x')]:
                            if max(img.size) > size:
                                ratio = size / max(img.size)
                                new_size = tuple(int(dim * ratio) for dim in img.size)
                                resized = img.resize(new_size, Image.Resampling.LANCZOS)
                                
                                sized_path = webp_path.with_name(
                                    f"{webp_path.stem}{suffix}{webp_path.suffix}"
                                )
                                resized.save(sized_path, 'WEBP', optimize=True, quality=85)
                                
                        logger.info(f"Optimized image: {image_file} -> {webp_path}")
                        
                except Exception as e:
                    logger.error(f"Error optimizing {image_file}: {str(e)}")
                    
    async def minify_js_css(self, source_dir: str):
        """JS/CSS压缩"""
        try:
            import jsmin
            import csscompressor
        except ImportError:
            logger.warning("jsmin/csscompressor not available, skipping minification")
            return
            
        source_path = Path(source_dir)
        
        for file_path in source_path.rglob("*"):
            if file_path.suffix == '.js' and not file_path.name.endswith('.min.js'):
                try:
                    content = file_path.read_text(encoding='utf-8')
                    minified = jsmin.jsmin(content)
                    
                    min_path = file_path.with_name(f"{file_path.stem}.min{file_path.suffix}")
                    min_path.write_text(minified, encoding='utf-8')
                    
                    logger.info(f"Minified JS: {file_path} -> {min_path}")
                except Exception as e:
                    logger.error(f"Error minifying {file_path}: {str(e)}")
                    
            elif file_path.suffix == '.css' and not file_path.name.endswith('.min.css'):
                try:
                    content = file_path.read_text(encoding='utf-8')
                    minified = csscompressor.compress(content)
                    
                    min_path = file_path.with_name(f"{file_path.stem}.min{file_path.suffix}")
                    min_path.write_text(minified, encoding='utf-8')
                    
                    logger.info(f"Minified CSS: {file_path} -> {min_path}")
                except Exception as e:
                    logger.error(f"Error minifying {file_path}: {str(e)}")

# 使用示例和测试
async def demo_edge_cache():
    """边缘缓存演示"""
    print("🚀 Edge Cache Demo Starting...")
    
    async with EdgeCache(max_size_gb=1.0) as cache:
        # 测试URL列表
        test_urls = [
            "https://jsonplaceholder.typicode.com/posts/1",
            "https://httpbin.org/json",
            "https://api.github.com/users/octocat",
        ]
        
        print("📥 Fetching resources...")
        for url in test_urls:
            content = await cache.get(url)
            if content:
                print(f"✅ Cached {url} ({len(content)} bytes)")
                
        print("\n📊 Cache Statistics:")
        stats = cache.get_stats()
        for key, value in stats.items():
            print(f"  {key}: {value}")
            
        print("\n🔄 Testing cache hits...")
        for url in test_urls:
            content = await cache.get(url)
            if content:
                print(f"⚡ Cache hit for {url}")
                
        print("\n📊 Final Statistics:")
        final_stats = cache.get_stats()
        for key, value in final_stats.items():
            print(f"  {key}: {value}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "demo":
        asyncio.run(demo_edge_cache())