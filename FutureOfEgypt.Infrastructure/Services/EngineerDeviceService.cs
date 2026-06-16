using FutureOfEgypt.Application.Features.EngineerDevices;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class EngineerDeviceService : IEngineerDeviceService
    {
        private readonly AppDbContext _context;

        public EngineerDeviceService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<EngineerDeviceResponse> AssignDeviceAsync(AssignDeviceRequest request, CancellationToken cancellationToken = default)
        {
            var engineer = await _context.Engineers
                .FirstOrDefaultAsync(
                    x => x.PublicId == request.EngineerPublicId && !x.IsDeleted,
                    cancellationToken);

            if (engineer is null)
                throw new InvalidOperationException("Engineer does not exist.");

            var device = await _context.Devices
                .FirstOrDefaultAsync(
                    x => x.PublicId == request.DevicePublicId && !x.IsDeleted,
                    cancellationToken);

            if (device is null)
                throw new InvalidOperationException("Device does not exist.");
            var sameActiveAssignment = await _context.EngineerDevices.AsNoTracking().Include(x => x.Engineer).Include(x => x.Device)
                .FirstOrDefaultAsync(x => x.EngineerId == engineer.Id&& x.DeviceId == device.Id&& x.IsActive && !x.IsDeleted, cancellationToken);

            if (sameActiveAssignment is not null)
            {
                return new EngineerDeviceResponse
                {
                    PublicId = sameActiveAssignment.PublicId,

                    EngineerPublicId = sameActiveAssignment.Engineer!.PublicId,
                    EngineerName = sameActiveAssignment.Engineer.FullName,

                    DevicePublicId = sameActiveAssignment.Device!.PublicId,
                    DeviceName = sameActiveAssignment.Device.DeviceName,

                    IsActive = sameActiveAssignment.IsActive,
                    AssignedAtUtc = sameActiveAssignment.AssignedAtUtc,
                    UnassignedAtUtc = sameActiveAssignment.UnassignedAtUtc
                };
            }
            var now = DateTime.UtcNow;

            var currentEngineerAssignments = await _context.EngineerDevices
                .Where(x => x.EngineerId == engineer.Id
                            && x.IsActive
                            && !x.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var assignment in currentEngineerAssignments)
            {
                assignment.IsActive = false;
                assignment.UnassignedAtUtc = now;
                assignment.UpdatedAt = now;
            }

            var currentDeviceAssignments = await _context.EngineerDevices
                .Where(x => x.DeviceId == device.Id
                            && x.IsActive
                            && !x.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var assignment in currentDeviceAssignments)
            {
                assignment.IsActive = false;
                assignment.UnassignedAtUtc = now;
                assignment.UpdatedAt = now;
            }

            var newAssignment = new EngineerDevice
            {
                EngineerId = engineer.Id,
                DeviceId = device.Id,
                AssignedAtUtc = now,
                IsActive = true
            };

            await _context.EngineerDevices.AddAsync(newAssignment, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            return new EngineerDeviceResponse
            {
                PublicId = newAssignment.PublicId,

                EngineerPublicId = engineer.PublicId,
                EngineerName = engineer.FullName,

                DevicePublicId = device.PublicId,
                DeviceName = device.DeviceName,

                IsActive = newAssignment.IsActive,
                AssignedAtUtc = newAssignment.AssignedAtUtc,
                UnassignedAtUtc = newAssignment.UnassignedAtUtc
            };
        }

        public async Task<IReadOnlyList<EngineerDeviceResponse>> GetAssignmentsAsync(CancellationToken cancellationToken = default)
        {
            return await _context.EngineerDevices
                .AsNoTracking()
                .Include(x => x.Engineer)
                .Include(x => x.Device)
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.AssignedAtUtc)
                .Select(x => new EngineerDeviceResponse
                {
                    PublicId = x.PublicId,

                    EngineerPublicId = x.Engineer!.PublicId,
                    EngineerName = x.Engineer.FullName,

                    DevicePublicId = x.Device!.PublicId,
                    DeviceName = x.Device.DeviceName,

                    IsActive = x.IsActive,
                    AssignedAtUtc = x.AssignedAtUtc,
                    UnassignedAtUtc = x.UnassignedAtUtc
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<EngineerDeviceResponse>> GetActiveAssignmentsAsync(CancellationToken cancellationToken = default)
        {
            return await _context.EngineerDevices
                .AsNoTracking()
                .Include(x => x.Engineer)
                .Include(x => x.Device)
                .Where(x => x.IsActive && !x.IsDeleted)
                .OrderByDescending(x => x.AssignedAtUtc)
                .Select(x => new EngineerDeviceResponse
                {
                    PublicId = x.PublicId,

                    EngineerPublicId = x.Engineer!.PublicId,
                    EngineerName = x.Engineer.FullName,

                    DevicePublicId = x.Device!.PublicId,
                    DeviceName = x.Device.DeviceName,

                    IsActive = x.IsActive,
                    AssignedAtUtc = x.AssignedAtUtc,
                    UnassignedAtUtc = x.UnassignedAtUtc
                })
                .ToListAsync(cancellationToken);
        }
    }
}