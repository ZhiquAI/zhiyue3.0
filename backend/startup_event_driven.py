#!/usr/bin/env python3
"""
Event-Driven Architecture Startup Script
智阅3.0重构第二阶段：事件驱动架构启动脚本

This script demonstrates how to start and use the event-driven architecture.
Run this to see the system in action.

Usage:
    python startup_event_driven.py
"""

import asyncio
import logging
import json
from datetime import datetime
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def demonstrate_event_system():
    """Demonstrate the event-driven system functionality"""
    from services.event_integration import EventSystemContext, event_system
    from services.event_bus import EventType
    
    logger.info("🚀 Starting Event-Driven Architecture Demo")
    
    async with EventSystemContext(num_workers=3) as system:
        logger.info("📊 Event system started successfully")
        
        # Wait a moment for all components to initialize
        await asyncio.sleep(2)
        
        # Display system status
        status = system.get_system_status()
        logger.info(f"📈 System Status: {json.dumps(status, indent=2, default=str)}")
        
        # Demonstrate event publishing
        logger.info("\n🔄 Demonstrating Event Publishing...")
        
        # Publish exam created event
        exam_id = "exam_demo_001"
        exam_data = {
            "name": "Demo Exam",
            "description": "Event system demonstration exam",
            "creator_id": "user_001"
        }
        
        event_id = await system.publish_exam_created(exam_id, exam_data, "user_001")
        logger.info(f"✅ Published exam created event: {event_id}")
        
        # Wait for event processing
        await asyncio.sleep(1)
        
        # Demonstrate task submission
        logger.info("\n📝 Demonstrating Task Submission...")
        
        # Submit OCR task
        ocr_task_id = await system.submit_ocr_task("file_001", exam_id)
        logger.info(f"✅ Submitted OCR task: {ocr_task_id}")
        
        # Submit grading task
        grading_task_id = await system.submit_grading_task(
            exam_id, 
            "student_001", 
            {"text_content": "Sample OCR result"}
        )
        logger.info(f"✅ Submitted grading task: {grading_task_id}")
        
        # Submit batch processing task
        batch_task_id = await system.submit_batch_processing_task({
            "batch_id": "batch_001",
            "processing_type": "demo",
            "items": ["item1", "item2", "item3"]
        })
        logger.info(f"✅ Submitted batch processing task: {batch_task_id}")
        
        # Wait for task processing
        logger.info("\n⏳ Waiting for task processing...")
        await asyncio.sleep(10)
        
        # Demonstrate complete workflow
        logger.info("\n🏭 Demonstrating Complete Workflow...")
        
        workflow_result = await system.process_exam_workflow(
            "workflow_exam_001",
            [
                {"file_id": "file_workflow_001"},
                {"file_id": "file_workflow_002"},
                {"file_id": "file_workflow_003"}
            ],
            "user_001"
        )
        logger.info(f"✅ Started workflow: {json.dumps(workflow_result, indent=2)}")
        
        # Wait for workflow processing
        await asyncio.sleep(15)
        
        # Health check
        logger.info("\n🏥 Performing Health Check...")
        health = await system.health_check()
        logger.info(f"🩺 Health Status: {json.dumps(health, indent=2, default=str)}")
        
        # Final system status
        logger.info("\n📊 Final System Status...")
        final_status = system.get_system_status()
        logger.info(f"📈 Final Metrics: {json.dumps(final_status['metrics'], indent=2, default=str)}")
        
        # Display queue stats
        task_stats = await system.task_queue.get_queue_stats()
        logger.info(f"📋 Task Queue Stats: {json.dumps(task_stats, indent=2)}")
        
        # Display WebSocket stats
        ws_stats = system.websocket_manager.get_connection_stats()
        logger.info(f"🔌 WebSocket Stats: {json.dumps(ws_stats, indent=2, default=str)}")
        
        logger.info("\n🎉 Event-driven system demonstration completed!")
        
        # Keep running for a bit to see final processing
        logger.info("⏰ Keeping system running for final processing...")
        await asyncio.sleep(10)


async def run_performance_test():
    """Run a performance test of the event system"""
    from services.event_integration import EventSystemContext
    
    logger.info("🏁 Starting Performance Test")
    
    async with EventSystemContext(num_workers=10) as system:
        start_time = datetime.now()
        
        # Submit multiple tasks concurrently
        tasks = []
        for i in range(50):
            # Mix different types of tasks
            if i % 3 == 0:
                task = system.submit_ocr_task(f"perf_file_{i}", f"perf_exam_{i//10}")
            elif i % 3 == 1:
                task = system.submit_grading_task(f"perf_exam_{i//10}", f"student_{i}", {"sample": "data"})
            else:
                task = system.submit_batch_processing_task({
                    "batch_id": f"perf_batch_{i}",
                    "items": [f"item_{j}" for j in range(5)]
                })
            tasks.append(task)
        
        # Submit all tasks
        task_ids = await asyncio.gather(*tasks)
        logger.info(f"📤 Submitted {len(task_ids)} tasks")
        
        # Wait for processing
        await asyncio.sleep(30)
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Get final stats
        final_status = system.get_system_status()
        
        logger.info(f"⚡ Performance Test Results:")
        logger.info(f"   Duration: {duration:.2f} seconds")
        logger.info(f"   Tasks Submitted: {final_status['metrics']['tasks_submitted']}")
        logger.info(f"   Tasks Completed: {final_status['metrics']['tasks_completed']}")
        logger.info(f"   Events Published: {final_status['metrics']['events_published']}")
        logger.info(f"   Errors: {final_status['metrics']['errors']}")
        logger.info(f"   Throughput: {final_status['metrics']['tasks_completed']/duration:.2f} tasks/second")


async def interactive_demo():
    """Interactive demo where user can input commands"""
    from services.event_integration import EventSystemContext
    
    logger.info("🎮 Starting Interactive Demo")
    logger.info("Commands: exam, ocr, grading, batch, status, health, quit")
    
    async with EventSystemContext() as system:
        while True:
            try:
                command = input("\n> Enter command: ").strip().lower()
                
                if command == "quit":
                    break
                elif command == "exam":
                    exam_id = input("Exam ID: ") or f"exam_{int(datetime.now().timestamp())}"
                    exam_name = input("Exam Name: ") or "Interactive Demo Exam"
                    await system.publish_exam_created(exam_id, {"name": exam_name}, "interactive_user")
                    logger.info(f"✅ Created exam: {exam_id}")
                    
                elif command == "ocr":
                    file_id = input("File ID: ") or f"file_{int(datetime.now().timestamp())}"
                    exam_id = input("Exam ID: ") or "default_exam"
                    task_id = await system.submit_ocr_task(file_id, exam_id)
                    logger.info(f"✅ Submitted OCR task: {task_id}")
                    
                elif command == "grading":
                    exam_id = input("Exam ID: ") or "default_exam"
                    student_id = input("Student ID: ") or f"student_{int(datetime.now().timestamp())}"
                    task_id = await system.submit_grading_task(exam_id, student_id, {"sample": "ocr"})
                    logger.info(f"✅ Submitted grading task: {task_id}")
                    
                elif command == "batch":
                    batch_id = input("Batch ID: ") or f"batch_{int(datetime.now().timestamp())}"
                    item_count = int(input("Number of items: ") or "5")
                    task_id = await system.submit_batch_processing_task({
                        "batch_id": batch_id,
                        "items": [f"item_{i}" for i in range(item_count)]
                    })
                    logger.info(f"✅ Submitted batch task: {task_id}")
                    
                elif command == "status":
                    status = system.get_system_status()
                    print(json.dumps(status, indent=2, default=str))
                    
                elif command == "health":
                    health = await system.health_check()
                    print(json.dumps(health, indent=2, default=str))
                    
                else:
                    logger.info("Unknown command. Available: exam, ocr, grading, batch, status, health, quit")
                    
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f"Command failed: {str(e)}")
    
    logger.info("👋 Interactive demo ended")


async def main():
    """Main function - choose demo type"""
    print("🌟 智阅3.0 Event-Driven Architecture Demo")
    print("Choose demo type:")
    print("1. Basic demonstration")
    print("2. Performance test")
    print("3. Interactive demo")
    
    try:
        choice = input("Enter choice (1-3): ").strip()
        
        if choice == "1":
            await demonstrate_event_system()
        elif choice == "2":
            await run_performance_test()
        elif choice == "3":
            await interactive_demo()
        else:
            logger.info("Invalid choice, running basic demonstration...")
            await demonstrate_event_system()
            
    except KeyboardInterrupt:
        logger.info("\n👋 Demo interrupted by user")
    except Exception as e:
        logger.error(f"❌ Demo failed: {str(e)}")


if __name__ == "__main__":
    # Check if required dependencies are available
    try:
        import aioredis
        logger.info("✅ Redis client available")
    except ImportError:
        logger.error("❌ aioredis not installed. Please install with: pip install aioredis")
        exit(1)
    
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"❌ Startup failed: {str(e)}")
        exit(1)