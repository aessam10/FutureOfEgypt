namespace FutureOfEgypt.Application.Common.Models
{
    public sealed class ApiErrorResponse
    {
        public string Message { get; set; } = string.Empty;

        public string TraceId { get; set; } = string.Empty;

        public IReadOnlyDictionary<string, string[]>? Errors { get; set; }
    }
}
