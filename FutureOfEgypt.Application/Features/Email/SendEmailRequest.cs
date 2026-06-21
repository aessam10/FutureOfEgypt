namespace FutureOfEgypt.Application.Features.Email
{
    public sealed class SendEmailRequest
    {
        public List<string> ToEmails { get; set; } = new();

        public List<string>? CcEmails { get; set; }

        public List<string>? BccEmails { get; set; }

        public string Subject { get; set; } = string.Empty;

        public string Body { get; set; } = string.Empty;
    }
}
