using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace FutureOfEgypt.Application.Features.AuditLog
{
    public sealed class AuditLogsQueryRequest : PagedRequest
    {
        public AuditActionType? ActionType { get; set; }

        public Guid? PerformedByUserId { get; set; }

        public string? EntityName { get; set; }

        public Guid? EntityPublicId { get; set; }

        public DateTime? FromUtc { get; set; }

        public DateTime? ToUtc { get; set; }
    }
}
