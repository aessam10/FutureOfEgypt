using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Domain.Enums;
using System.Linq;

namespace FutureOfEgypt.Infrastructure.Extensions
{
    public static class EngineerDeviceQueryExtensions
    {
        public static IQueryable<EngineerDevice> FilterValidActive(this IQueryable<EngineerDevice> query)
        {
            return query
                .Where(x => x.IsActive 
                            && !x.IsDeleted
                            && x.Engineer != null
                            && !x.Engineer.IsDeleted
                            && x.Engineer.Status == EngineerStatus.Active
                            && x.Device != null
                            && !x.Device.IsDeleted
                            && x.Device.Status == DeviceStatus.Active);
        }
    }
}
