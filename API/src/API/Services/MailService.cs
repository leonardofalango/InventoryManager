using Amazon;
using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;

namespace Api.Services
{
    public class AwsSesEmailService : IMailService
    {
        private readonly IConfiguration _config;

        public AwsSesEmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string to, string subject, string htmlBody)
        {
            var accessKey = _config["AWSSES:AccessKey"];
            var secretKey = _config["AWSSES:SecretKey"];
            var regionString = _config["AWSSES:Region"];
            var senderAddress = _config["AWSSES:SenderEmail"];

            var region = RegionEndpoint.GetBySystemName(regionString);

            using var client = new AmazonSimpleEmailServiceClient(accessKey, secretKey, region);

            var sendRequest = new SendEmailRequest
            {
                Source = senderAddress,
                Destination = new Destination
                {
                    ToAddresses = new List<string> { to }
                },
                Message = new Message
                {
                    Subject = new Content(subject),
                    Body = new Body
                    {
                        Html = new Content(htmlBody)
                    }
                }
            };

            try
            {
                await client.SendEmailAsync(sendRequest);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao enviar email: {ex.Message}");
                throw;
            }
        }
    }
}