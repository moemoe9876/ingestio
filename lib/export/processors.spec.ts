import { expandArrayFields } from './processors';

describe('lib/export/processors', () => {
  describe('expandArrayFields', () => {
    it('should return original data if no fields to expand are specified', () => {
      const data = [{ id: 1, name: 'Test', tags: ['a', 'b'] }];
      expect(expandArrayFields(data, [])).toEqual(data);
      expect(expandArrayFields(data, undefined as any)).toEqual(data);
    });

    it('should expand a single array field correctly', () => {
      const data = [{ id: 1, name: 'Item 1', tags: ['tag1', 'tag2'] }];
      const expected = [
        { id: 1, name: 'Item 1', tags: 'tag1' },
        { id: 1, name: 'Item 1', tags: 'tag2' },
      ];
      expect(expandArrayFields(data, ['tags'])).toEqual(expected);
    });

    it('should return the item with field as null if array is empty', () => {
      const data = [{ id: 1, name: 'Item 1', tags: [] }];
      const expected = [{ id: 1, name: 'Item 1', tags: null }];
      expect(expandArrayFields(data, ['tags'])).toEqual(expected);
    });

    it('should handle items without the specified array field', () => {
      const data = [
        { id: 1, name: 'Item 1', tags: ['tag1'] },
        { id: 2, name: 'Item 2', remarks: ['remark1'] },
      ];
      const expected = [
        { id: 1, name: 'Item 1', tags: 'tag1' },
        { id: 2, name: 'Item 2', remarks: ['remark1'] },
      ];
      expect(expandArrayFields(data, ['tags'])).toEqual(expected);
    });
    
    it('should handle multiple items with and without array fields to expand', () => {
       const data = [
         { id: 1, name: 'Doc A', keywords: ['dev', 'test'] },
         { id: 2, name: 'Doc B', keywords: ['prod'] },
         { id: 3, name: 'Doc C', description: 'No keywords' },
         { id: 4, name: 'Doc D', keywords: [] },
       ];
       const fieldsToExpand = ['keywords'];
       const expected = [
         { id: 1, name: 'Doc A', keywords: 'dev' },
         { id: 1, name: 'Doc A', keywords: 'test' },
         { id: 2, name: 'Doc B', keywords: 'prod' },
         { id: 3, name: 'Doc C', description: 'No keywords' },
         { id: 4, name: 'Doc D', keywords: null },
       ];
       expect(expandArrayFields(data, fieldsToExpand)).toEqual(expected);
    });

    it('should iteratively expand multiple array fields', () => {
      const data = [
        { id: 1, name: 'Event', attendees: ['Alice', 'Bob'], tasks: ['Setup', 'Teardown'] },
        { id: 2, name: 'Project', attendees: ['Charlie'], tasks: ['Code'] }
      ];
      const expected = [
        { id: 1, name: 'Event', attendees: 'Alice', tasks: 'Setup' },
        { id: 1, name: 'Event', attendees: 'Alice', tasks: 'Teardown' },
        { id: 1, name: 'Event', attendees: 'Bob', tasks: 'Setup' },
        { id: 1, name: 'Event', attendees: 'Bob', tasks: 'Teardown' },
        { id: 2, name: 'Project', attendees: 'Charlie', tasks: 'Code' },
      ];
      expect(expandArrayFields(data, ['attendees', 'tasks'])).toEqual(expected);
    });

     it('should handle one field being empty array during multi-field expansion', () => {
         const data = [
             { id: 1, name: 'Item X', categories: ['cat1', 'cat2'], tags: [] }
         ];
         const fieldsToExpand = ['categories', 'tags'];
         const expected = [
             { id: 1, name: 'Item X', categories: 'cat1', tags: null },
             { id: 1, name: 'Item X', categories: 'cat2', tags: null },
         ];
         expect(expandArrayFields(data, fieldsToExpand)).toEqual(expected);
     });
  });
});
