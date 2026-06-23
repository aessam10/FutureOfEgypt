namespace FutureOfEgypt.Options
{
    public class ProfileImagesOptions
    {
        public const string ProfileImages = "ProfileImages";

        public string StoragePath { get; set; } = string.Empty;

        public long MaxSizeBytes { get; set; } = 2097152;

        public string[] AllowedExtensions { get; set; } = Array.Empty<string>();
    }
}
