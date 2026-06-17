using System;
using System.Collections.Generic;
using System.Text;

namespace FutureOfEgypt.Application.Features.Dashboard
{
    public sealed class DashboardSummaryResponse
    {
        public int TotalEngineers { get; set; }

        public int ActiveEngineers { get; set; }

        public int TotalDevices { get; set; }

        public int ActiveDevices { get; set; }

        public int ActiveAssignments { get; set; }

        public int PendingDeviceAccessRequests { get; set; }

        public int OnlineEngineers { get; set; }

        public int OfflineEngineers { get; set; }
    }
}
