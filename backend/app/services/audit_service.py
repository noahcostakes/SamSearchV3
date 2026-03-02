"""Audit logging service for compliance and security tracking."""
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.core.logging_config import get_logger
from app.models.audit_log import AuditLog

logger = get_logger(__name__)


async def log_audit_event(
    db: AsyncSession,
    *,
    action: str,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    request: Optional[Request] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    status: str = "success",
    error_message: Optional[str] = None,
) -> None:
    """Write an audit log entry.

    Non-blocking: errors are logged but never bubble up to callers.

    Args:
        db: Database session.
        action: Action name (e.g. "login", "search.start", "opportunity.save").
        user_id: ID of the acting user.
        user_email: Email of the acting user.
        request: Starlette Request for IP / user-agent / request ID extraction.
        resource_type: Kind of resource acted on.
        resource_id: Identifier of target resource.
        details: Additional JSON-safe context.
        status: "success" | "failure" | "denied".
        error_message: Human-readable error detail on failure.
    """
    try:
        request_id: Optional[str] = None
        ip_address: Optional[str] = None
        user_agent: Optional[str] = None

        if request is not None:
            request_id = getattr(request.state, "request_id", None)
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent", "")[:500]

        entry = AuditLog(
            user_id=user_id,
            user_email=user_email,
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            status=status,
            error_message=error_message,
        )

        db.add(entry)
        await db.commit()

    except Exception as exc:
        # Never let audit failures break the primary flow
        logger.error(f"Audit log write failed: {exc}", extra={"action": action})
