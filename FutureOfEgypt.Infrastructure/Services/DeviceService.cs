using FutureOfEgypt.Application.Features.Devices;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class DeviceService : IDeviceService
    {
        private readonly AppDbContext _context;

        public DeviceService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DeviceResponse> CreateDeviceAsync(
            CreateDeviceRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.DeviceName))
                throw new InvalidOperationException("Device name is required.");

            if (string.IsNullOrWhiteSpace(request.SerialNumber))
                throw new InvalidOperationException("Serial number is required.");

            var serialExists = await _context.Devices
                .AnyAsync(x => x.SerialNumber == request.SerialNumber && !x.IsDeleted, cancellationToken);

            if (serialExists)
                throw new InvalidOperationException("Serial number already exists.");

            var device = new Device
            {
                DeviceName = request.DeviceName.Trim(),
                SerialNumber = request.SerialNumber.Trim(),
                Imei = request.Imei,
                Platform = request.Platform,
                Status = request.Status
            };

            await _context.Devices.AddAsync(device, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            return new DeviceResponse
            {
                PublicId = device.PublicId,
                DeviceName = device.DeviceName,
                SerialNumber = device.SerialNumber,
                Imei = device.Imei,
                Platform = device.Platform,
                Status = device.Status,
                LastSeenAtUtc = device.LastSeenAtUtc,
                CreatedAt = device.CreatedAt
            };
        }

        public async Task<IReadOnlyList<DeviceResponse>> GetDevicesAsync(
            CancellationToken cancellationToken = default)
        {
            return await _context.Devices
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new DeviceResponse
                {
                    PublicId = x.PublicId,
                    DeviceName = x.DeviceName,
                    SerialNumber = x.SerialNumber,
                    Imei = x.Imei,
                    Platform = x.Platform,
                    Status = x.Status,
                    LastSeenAtUtc = x.LastSeenAtUtc,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync(cancellationToken);
        }
    }
}