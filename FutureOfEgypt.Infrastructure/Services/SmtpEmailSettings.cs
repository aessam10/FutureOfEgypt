namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class SmtpEmailSettings
    {
        public string Host { get; set; } = string.Empty;

        public int Port { get; set; } = 587;

        public bool EnableSsl { get; set; } = true;

        public string UserName { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;
    }
}
