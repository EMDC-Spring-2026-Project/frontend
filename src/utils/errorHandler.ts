import toast from "react-hot-toast";

/**
 * Extracts error message from various error response formats
 * Handles Django REST Framework, Axios, and generic error formats
 */
export const extractErrorMessage = (error: any): string => {
  // Handle Axios error responses
  if (error?.response?.data) {
    const data = error.response.data;
    
    // If data is a string, return it directly
    if (typeof data === 'string') {
      return data;
    }
    
    // Check for common error message fields
    if (data.error && typeof data.error === 'string') {
      return data.error;
    }
    
    if (data.detail && typeof data.detail === 'string') {
      return data.detail;
    }
    
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }
    
    // Handle Django-style error objects
    if (data.errors && typeof data.errors === 'object') {
      // Try to extract meaningful error messages from Django validation errors
      if (Array.isArray(data.errors)) {
        return data.errors.join(', ');
      }
      // Check for nested detail field in errors object
      if (data.errors.detail && typeof data.errors.detail === 'string') {
        return data.errors.detail;
      }
      // If it's an array within the errors object, join it
      if (data.errors.detail && Array.isArray(data.errors.detail)) {
        return data.errors.detail.join(', ');
      }
      // If it's an object, stringify it 
      return JSON.stringify(data.errors);
    }
  }
  
  // Handle generic error messages
  if (error?.message && typeof error.message === 'string') {
    return error.message;
  }
  
  // Fallback for unknown error formats
  return "An unexpected error occurred";
};

/**
 * Checks if error indicates a duplicate/conflict (e.g., account already exists)
 */
export const isDuplicateError = (errorMessage: string): boolean => {
  const lowerMessage = errorMessage.toLowerCase();
  return (
    lowerMessage.includes("already exists") ||
    lowerMessage.includes("duplicate") ||
    (lowerMessage.includes("username") && lowerMessage.includes("taken")) ||
    lowerMessage.includes("unique constraint") ||
    lowerMessage.includes("already in use")
  );
};

/**
 * Checks if error indicates a validation error
 */
export const isValidationError = (errorMessage: string): boolean => {
  const lowerMessage = errorMessage.toLowerCase();
  return (
    lowerMessage.includes("required") ||
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("validation") ||
    lowerMessage.includes("field")
  );
};

/**
 * Checks if error indicates a permission/authorization error
 */
export const isPermissionError = (errorMessage: string): boolean => {
  const lowerMessage = errorMessage.toLowerCase();
  return (
    lowerMessage.includes("permission") ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("forbidden") ||
    lowerMessage.includes("access denied")
  );
};

/**
 * Gets a user-friendly error message based on error type
 */
export const getUserFriendlyErrorMessage = (
  error: any,
  defaultMessage: string = "An error occurred. Please try again."
): string => {
  const errorMessage = extractErrorMessage(error);
  
  if (isDuplicateError(errorMessage)) {
    return "This record already exists in the system";
  }
  
  if (isValidationError(errorMessage)) {
    return errorMessage; // Return validation errors as-is (they're usually user-friendly)
  }
  
  if (isPermissionError(errorMessage)) {
    return "You don't have permission to perform this action";
  }
  
  // For other errors, return the extracted message or default
  return errorMessage || defaultMessage;
};

/**
 * Handles error and shows appropriate toast notification
 */
export const handleError = (
  error: any,
  options: {
    defaultMessage?: string;
    showToast?: boolean;
    onDuplicate?: () => void;
    onValidation?: () => void;
    onPermission?: () => void;
  } = {}
): string => {
  const {
    defaultMessage = "An error occurred. Please try again.",
    showToast = true,
    onDuplicate,
    onValidation,
    onPermission,
  } = options;
  
  const errorMessage = extractErrorMessage(error);
  const userFriendlyMessage = getUserFriendlyErrorMessage(error, defaultMessage);
  
  // Call appropriate callback if provided
  if (isDuplicateError(errorMessage) && onDuplicate) {
    onDuplicate();
  } else if (isValidationError(errorMessage) && onValidation) {
    onValidation();
  } else if (isPermissionError(errorMessage) && onPermission) {
    onPermission();
  }
  
  // Show toast notification if enabled
  if (showToast) {
    toast.error(userFriendlyMessage);
  }
  
  return errorMessage;
};

/**
 * Handles error for account creation/update operations
 * Specifically handles duplicate account errors
 */
export const handleAccountError = (
  error: any,
  operation: "create" | "update" | "delete" = "create"
): string => {
  const errorMessage = extractErrorMessage(error);
  
  if (isDuplicateError(errorMessage)) {
    // Use the detailed error message from backend if available, otherwise use generic message
    const displayMessage = errorMessage && errorMessage !== "An unexpected error occurred" 
      ? errorMessage 
      : "An account already exists under that name.";
    toast.error(displayMessage);
    return errorMessage;
  }
  
  const operationMessages = {
    create: "Failed to create account. Please try again.",
    update: "Failed to update account. Please try again.",
    delete: "Failed to delete account. Please try again.",
  };
  
  toast.error(errorMessage || operationMessages[operation]);
  return errorMessage;
};

/**
 * Handles error for general CRUD operations
 */
export const handleCrudError = (
  error: any,
  operation: "create" | "update" | "delete",
  entityName: string
): string => {
  const errorMessage = extractErrorMessage(error);
  
  if (isDuplicateError(errorMessage)) {
    toast.error(`${entityName} already exists in the system`);
    return errorMessage;
  }
  
  const operationMessages = {
    create: `Failed to create ${entityName}. Please try again.`,
    update: `Failed to update ${entityName}. Please try again.`,
    delete: `Failed to delete ${entityName}. Please try again.`,
  };
  
  toast.error(errorMessage || operationMessages[operation]);
  return errorMessage;
};

