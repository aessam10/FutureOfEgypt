public class CreateFirstAdminRequest
{
    public string Email { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;

    public string BootstrapPassword { get; set; } = string.Empty;
}