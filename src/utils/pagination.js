// Get pagination parameters
const getPagination = (page, size) => {
    const limit = size ? Number(size) : 10;
    const pageNumber = page !== undefined && page !== null ? parseInt(page, 10) : NaN;
    const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const offset = (safePage - 1) * limit;

    return { limit, offset };
};

// Get paging data for response
const getPagingData = (data, page, limit) => {
    const { count: totalItems, rows: items } = data;
    const pageNumber = page !== undefined && page !== null ? parseInt(page, 10) : NaN;
    const currentPage = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const totalPages = Math.ceil(totalItems / limit);

    return {
        items,
        pagination: {
            totalItems,
            totalPages,
            currentPage,
            pageSize: limit,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
        }
    };
};

module.exports = {
    getPagination,
    getPagingData
};