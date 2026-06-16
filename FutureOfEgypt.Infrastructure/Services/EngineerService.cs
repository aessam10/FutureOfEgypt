using FutureOfEgypt.Application.Features.Engineers;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class EngineerService : IEngineerService
    {
        private readonly AppDbContext _context;

        public EngineerService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<EngineerResponse> CreateEngineerAsync(
            CreateEngineerRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
                throw new InvalidOperationException("Engineer full name is required.");

            var engineer = new Engineer
            {
                FullName = request.FullName.Trim(),
                PhoneNumber = request.PhoneNumber,
                Email = request.Email,
                Status = request.Status
            };

            await _context.Engineers.AddAsync(engineer, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            return new EngineerResponse
            {
                PublicId = engineer.PublicId,
                FullName = engineer.FullName,
                PhoneNumber = engineer.PhoneNumber,
                Email = engineer.Email,
                Status = engineer.Status,
                CreatedAt = engineer.CreatedAt
            };
        }

        public async Task<IReadOnlyList<EngineerResponse>> GetEngineersAsync(
            CancellationToken cancellationToken = default)
        {
            return await _context.Engineers
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new EngineerResponse
                {
                    PublicId = x.PublicId,
                    FullName = x.FullName,
                    PhoneNumber = x.PhoneNumber,
                    Email = x.Email,
                    Status = x.Status,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync(cancellationToken);
        }
    }
}