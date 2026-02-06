/**
 * Build Comment Tree from Flat Array
 * Organizes comments into parent → replies structure
 */

export function buildCommentTree(flatComments) {
    if (!Array.isArray(flatComments) || flatComments.length === 0) {
        return [];
    }

    // Separate top-level comments from replies
    const rootComments = flatComments.filter(c => !c.parent_id);

    // Build tree with replies nested
    return rootComments.map(parent => ({
        ...parent,
        replies: flatComments.filter(c => c.parent_id === parent.id)
    }));
}

/**
 * Count total comments (including replies)
 */
export function countAllComments(commentTree) {
    return commentTree.reduce((total, comment) => {
        return total + 1 + (comment.replies?.length || 0);
    }, 0);
}
