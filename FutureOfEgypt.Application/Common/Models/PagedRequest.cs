namespace FutureOfEgypt.Application.Common.Models
{
    /// <summary>
    /// This protects the API from someone asking for 100,000 records in one request.
    /// </summary>
    public class PagedRequest
    {
        private const int MaxPageSize = 200;

        private int _pageNumber = 1;
        private int _pageSize = 50;

        public int PageNumber
        {
            get => _pageNumber;
            set => _pageNumber = value < 1 ? 1 : value;
        }

        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = value < 1
                ? 50
                : value > MaxPageSize
                    ? MaxPageSize
                    : value;
        }
    }
}