// Get pagination parameters
const getPagination = (page, size) => {
    const limit = size ? +size : 10;
    const offset = page ? page * limit : 0;

    return { limit, offset };
};

// Get paging data for response
const getPagingData = (data, page, limit) => {
    const { count: totalItems, rows: items } = data;
    const currentPage = page ? +page : 0;
    const totalPages = Math.ceil(totalItems / limit);

    return {
        items,
        pagination: {
            totalItems,
            totalPages,
            currentPage,
            pageSize: limit,
            hasNextPage: currentPage < totalPages - 1,
            hasPrevPage: currentPage > 0
        }
    };
};

module.exports = {
    getPagination,
    getPagingData
};