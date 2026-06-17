using System;
using System.Collections.Generic;
using System.Text;

namespace FutureOfEgypt.Application.Features.Auth
{
    public sealed class RefreshTokenRequest
    {
        public string RefreshToken { get; set; } = string.Empty;
    }
}
