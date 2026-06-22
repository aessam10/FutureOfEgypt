namespace FutureOfEgypt.Domain.Enums
{
    /// <summary>
    /// Describes how urgently an app update is required.
    /// </summary>
    public enum AppUpdateLevel
    {
        /// <summary>App is up to date. No update prompt.</summary>
        None = 0,

        /// <summary>Update is available but optional. Soft prompt only.</summary>
        Optional = 1,

        /// <summary>Update is strongly recommended. Engineer can still continue.</summary>
        Required = 2,

        /// <summary>Update is mandatory. App is blocked until updated.</summary>
        Mandatory = 3
    }
}
