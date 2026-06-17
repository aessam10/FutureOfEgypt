using System;
using System.Collections.Generic;
using System.Text;

namespace FutureOfEgypt.Application.Features.Dashboard
{
    public interface IDashboardService
    {
        Task<DashboardSummaryResponse> GetSummaryAsync(
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<EngineerStatusResponse>> GetEngineersStatusAsync(
            CancellationToken cancellationToken = default);
    }
}
