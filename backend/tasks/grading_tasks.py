"""Celery 评分任务"""

import asyncio
import logging
from celery import Celery

logger = logging.getLogger(__name__)

# Celery应用配置
app = Celery('zhiyue_ai')

@app.task(bind=True, max_retries=3)
def grade_answer_sheet(self, answer_sheet_id: str):
    """异步评分任务"""
    try:
        from database import get_db
        from services.grading_service import GradingService
        
        db = next(get_db())
        grading_service = GradingService(db)
        
        # 运行异步方法
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                grading_service.grade_single_answer_sheet(answer_sheet_id)
            )
        finally:
            loop.close()
        
        return result
        
    except Exception as e:
        logger.error(f"Grading task failed: {str(e)}")
        self.retry(countdown=60, exc=e)