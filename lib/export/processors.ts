/**
 * Expands objects with specified array fields into multiple objects,
 * one for each item in the array field.
 *
 * Example:
 * Input:
 * [
 *   { id: 1, name: 'Alice', tags: ['A', 'B'], data: 'X' },
 *   { id: 2, name: 'Bob', tags: ['C'], data: 'Y' }
 * ], ['tags']
 *
 * Output:
 * [
 *   { id: 1, name: 'Alice', tags: 'A', data: 'X' },
 *   { id: 1, name: 'Alice', tags: 'B', data: 'X' },
 *   { id: 2, name: 'Bob', tags: 'C', data: 'Y' }
 * ]
 *
 * @param data An array of objects to process.
 * @param fieldsToExpand An array of string keys identifying the array fields to expand.
 * @returns A new array of objects with array fields expanded.
 */
export function expandArrayFields(data: any[], fieldsToExpand: string[]): any[] {
  if (!fieldsToExpand || fieldsToExpand.length === 0) {
    return data; // Return original data if no fields to expand
  }

  let processedData: any[] = [];

  data.forEach(item => {
    let hasExpanded = false;
    // Check each field specified for expansion
    for (const field of fieldsToExpand) {
      if (item.hasOwnProperty(field) && Array.isArray(item[field])) {
        const arrayToExpand = item[field];
        if (arrayToExpand.length > 0) {
          hasExpanded = true;
          arrayToExpand.forEach(arrayValue => {
            // Create a new object for each value in the array
            // The expanded field now holds the single value from the array
            processedData.push({ ...item, [field]: arrayValue });
          });
        } else {
          // If the array is empty, we might want to keep the item but with the field empty or removed
          // For now, let's create one entry with the field being undefined or null
          // Or, if the goal is to only include rows that have values, this could be skipped.
          // For simplicity, let's push a version with the field value as null if it was an empty array.
           if (!hasExpanded) { // ensure we don't add this if another field already expanded it.
            processedData.push({ ...item, [field]: null });
            hasExpanded = true; // Mark as expanded to avoid duplicating if multiple array fields are empty
           } else {
            // If other fields expanded this item, we need to add this empty field to those expansions
            processedData = processedData.map(pdItem => {
                // Add this null field only if the item matches and doesn't have this field expanded yet
                if (JSON.stringify({...pdItem, [field]: undefined}) === JSON.stringify({...item, [field]: undefined})) {
                    return {...pdItem, [field]: null };
                }
                return pdItem;
            });
           }
        }
        // Once one field is chosen to be the primary source of expansion for this item,
        // we should ideally handle how other array fields in the same item are treated.
        // The current logic will expand based on the first field in fieldsToExpand that is an array.
        // For more complex scenarios (e.g. cartesian product of multiple array fields), this would need refinement.
        // For now, this expands based on one field at a time as encountered.
        // A more robust way would be to process one field, then pass the result to process the next.
        // However, the current prompt implies expanding each object based on its array fields.
        // Let's refine to ensure if an item was expanded by one field, subsequent array fields
        // in the original item are just carried over as-is (or also expanded if that's the desired behavior).

        // The current logic: if item has field 'A' = [1,2] and 'B' = ['x','y']
        // and fieldsToExpand = ['A', 'B']
        // it will first expand by A: {A:1, B:['x','y']}, {A:2, B:['x','y']}
        // then it continues the loop for 'B' on the original item, which is not what we want.
        // We should only expand an item once by the first matching expandable field.
        // Or, if a cartesian product is desired, the logic needs to be recursive or iterative in a different way.

        // Let's simplify: the current implementation will iterate through fieldsToExpand.
        // If an item is expanded by `fieldsToExpand[0]`, the resulting items will then be evaluated for `fieldsToExpand[1]`, etc.
        // This requires a slightly different structure.

        // Revised approach: Process one field at a time for the entire dataset.
      }
    }
    if (!hasExpanded) {
      // If no field was an array or all relevant arrays were empty, add the original item
      processedData.push({ ...item });
    }
  });
  
  // The above logic is a bit flawed for multiple fieldsToExpand.
  // Let's refine it to process one field at a time iteratively.
  
  let currentData = [...data]; // Start with a copy of the original data

  fieldsToExpand.forEach(field => {
    const newData: any[] = [];
    currentData.forEach(item => {
      if (item.hasOwnProperty(field) && Array.isArray(item[field])) {
        const arrayToExpand = item[field];
        if (arrayToExpand.length > 0) {
          arrayToExpand.forEach(arrayValue => {
            newData.push({ ...item, [field]: arrayValue });
          });
        } else {
          // If array is empty, keep the item but set the field to null or handle as per requirements
          newData.push({ ...item, [field]: null }); 
        }
      } else {
        // If the field is not an array or doesn't exist, keep the item as is
        newData.push({ ...item });
      }
    });
    currentData = newData; // Update currentData to be the result of this expansion pass
  });

  return currentData;
}
