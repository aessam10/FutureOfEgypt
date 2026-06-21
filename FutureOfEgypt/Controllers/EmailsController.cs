using FutureOfEgypt.Application.Features.Email;
using FutureOfEgypt.Extensions;
using Microsoft.AspNetCore.Authorization;

namespace FutureOfEgypt.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "AdminOrManager")]
    public sealed class EmailsController : ControllerBase
    {
        private readonly IEmailService _emailService;

        public EmailsController(IEmailService emailService)
        {
            _emailService = emailService;
        }

        [HttpPost("send")]
        public async Task<IActionResult> Send(
            [FromBody] SendEmailRequest request,
            CancellationToken cancellationToken)
        {
            var senderUserId = User.GetUserId();
            var senderEmail = User.GetUserEmail();

            var result = await _emailService.SendAsync(
                senderUserId,
                senderEmail,
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        {
            var result = await _emailService.GetAllAsync(cancellationToken);

            return Ok(result);
        }

        [HttpGet("{publicId:guid}")]
        public async Task<IActionResult> GetByPublicId(
            Guid publicId,
            CancellationToken cancellationToken)
        {
            var result = await _emailService.GetByPublicIdAsync(
                publicId,
                cancellationToken);

            return Ok(result);
        }
    }
}