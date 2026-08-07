/**
 * @fileoverview Tests for NgRxStateNormalizationPatternConstants
 * @description NgRx state normalization pattern matching constants
 */
import { NgRxStateNormalizationPatternConstants } from '../../../src/laws/angular/ngrx-state-normalization-mandate/constants/patterns';

describe('NgRxStateNormalizationPatternConstants', () => {
  describe('NGRX_ENTITY_PACKAGE', () => {
    it('should be @ngrx/entity', () => {
      expect(NgRxStateNormalizationPatternConstants.NGRX_ENTITY_PACKAGE).toBe(
        '@ngrx/entity'
      );
    });
  });

  describe('ENTITY_PATTERNS', () => {
    describe('CREATE_ENTITY_ADAPTER', () => {
      it('should match createEntityAdapter', () => {
        expect(
          NgRxStateNormalizationPatternConstants.ENTITY_PATTERNS.CREATE_ENTITY_ADAPTER.test(
            'createEntityAdapter'
          )
        ).toBe(true);
        expect(
          NgRxStateNormalizationPatternConstants.ENTITY_PATTERNS.CREATE_ENTITY_ADAPTER.test(
            'const adapter = createEntityAdapter<User>()'
          )
        ).toBe(true);
      });

      it('should not match unrelated content', () => {
        expect(
          NgRxStateNormalizationPatternConstants.ENTITY_PATTERNS.CREATE_ENTITY_ADAPTER.test(
            'some other code'
          )
        ).toBe(false);
      });
    });

    describe('ENTITY_ADAPTER_CLASS', () => {
      it('should match EntityAdapter', () => {
        expect(
          NgRxStateNormalizationPatternConstants.ENTITY_PATTERNS.ENTITY_ADAPTER_CLASS.test(
            'EntityAdapter'
          )
        ).toBe(true);
        expect(
          NgRxStateNormalizationPatternConstants.ENTITY_PATTERNS.ENTITY_ADAPTER_CLASS.test(
            'EntityAdapter<User>'
          )
        ).toBe(true);
      });
    });

    describe('ENTITY_STATE_INTERFACE', () => {
      it('should match EntityState', () => {
        expect(
          NgRxStateNormalizationPatternConstants.ENTITY_PATTERNS.ENTITY_STATE_INTERFACE.test(
            'EntityState'
          )
        ).toBe(true);
        expect(
          NgRxStateNormalizationPatternConstants.ENTITY_PATTERNS.ENTITY_STATE_INTERFACE.test(
            'interface State extends EntityState<User>'
          )
        ).toBe(true);
      });
    });
  });

  describe('NORMALIZATION_PATTERNS', () => {
    describe('FLAT_STATE', () => {
      it('should match flat state structure with ids and entities', () => {
        const flatState = 'ids: number[]\nentities: {';
        expect(
          NgRxStateNormalizationPatternConstants.NORMALIZATION_PATTERNS.FLAT_STATE.test(
            flatState
          )
        ).toBe(true);
      });

      it('should match multiline flat state', () => {
        const content = `
          interface State {
            ids: string[]
            entities: {
              [id: string]: User
            }
          }
        `;
        expect(
          NgRxStateNormalizationPatternConstants.NORMALIZATION_PATTERNS.FLAT_STATE.test(
            content
          )
        ).toBe(true);
      });
    });

    describe('ENTITY_ADAPTER_USAGE', () => {
      it('should match createEntityAdapter usage', () => {
        expect(
          NgRxStateNormalizationPatternConstants.NORMALIZATION_PATTERNS.ENTITY_ADAPTER_USAGE.test(
            'createEntityAdapter'
          )
        ).toBe(true);
      });

      it('should match EntityAdapter usage', () => {
        expect(
          NgRxStateNormalizationPatternConstants.NORMALIZATION_PATTERNS.ENTITY_ADAPTER_USAGE.test(
            'EntityAdapter'
          )
        ).toBe(true);
      });
    });
  });

  describe('NESTED_STATE_ANTIPATTERNS', () => {
    describe('THREE_LEVELS_DEEP', () => {
      it('should match deeply nested state', () => {
        const deepNested = 'user: { profile: { settings: {';
        expect(
          NgRxStateNormalizationPatternConstants.NESTED_STATE_ANTIPATTERNS.THREE_LEVELS_DEEP.test(
            deepNested
          )
        ).toBe(true);
      });
    });

    describe('USER_NESTED_PROFILE', () => {
      it('should match user with nested profile', () => {
        const nestedProfile = 'user: { name: "test", profile: {';
        expect(
          NgRxStateNormalizationPatternConstants.NESTED_STATE_ANTIPATTERNS.USER_NESTED_PROFILE.test(
            nestedProfile
          )
        ).toBe(true);
      });
    });

    describe('ARRAY_IN_STATE', () => {
      it('should match arrays in state', () => {
        expect(
          NgRxStateNormalizationPatternConstants.NESTED_STATE_ANTIPATTERNS.ARRAY_IN_STATE.test(
            'users: User[]'
          )
        ).toBe(true);
        expect(
          NgRxStateNormalizationPatternConstants.NESTED_STATE_ANTIPATTERNS.ARRAY_IN_STATE.test(
            'items: string[]'
          )
        ).toBe(true);
      });
    });
  });

  describe('SELECTOR_PATTERNS', () => {
    describe('CREATE_SELECTOR', () => {
      it('should match createSelector', () => {
        expect(
          NgRxStateNormalizationPatternConstants.SELECTOR_PATTERNS.CREATE_SELECTOR.test(
            'createSelector'
          )
        ).toBe(true);
      });
    });

    describe('SELECT_ALL', () => {
      it('should match selectAll', () => {
        expect(
          NgRxStateNormalizationPatternConstants.SELECTOR_PATTERNS.SELECT_ALL.test(
            'selectAll'
          )
        ).toBe(true);
      });

      it('should match selectIds', () => {
        expect(
          NgRxStateNormalizationPatternConstants.SELECTOR_PATTERNS.SELECT_ALL.test(
            'selectIds'
          )
        ).toBe(true);
      });

      it('should match selectEntities', () => {
        expect(
          NgRxStateNormalizationPatternConstants.SELECTOR_PATTERNS.SELECT_ALL.test(
            'selectEntities'
          )
        ).toBe(true);
      });
    });

    describe('MANUAL_ENTITY_ACCESS', () => {
      it('should match state.entities access', () => {
        expect(
          NgRxStateNormalizationPatternConstants.SELECTOR_PATTERNS.MANUAL_ENTITY_ACCESS.test(
            'state.entities'
          )
        ).toBe(true);
      });

      it('should match state.ids access', () => {
        expect(
          NgRxStateNormalizationPatternConstants.SELECTOR_PATTERNS.MANUAL_ENTITY_ACCESS.test(
            'state.ids'
          )
        ).toBe(true);
      });
    });

    describe('MAP_WITH_FIND', () => {
      it('should match map with find pattern', () => {
        const badPattern = '.map(id => users.find(u => u.id === id))';
        expect(
          NgRxStateNormalizationPatternConstants.SELECTOR_PATTERNS.MAP_WITH_FIND.test(
            badPattern
          )
        ).toBe(true);
      });
    });
  });

  describe('VIOLATION_MESSAGES', () => {
    it('should have NO_ENTITY_ADAPTER message', () => {
      expect(
        NgRxStateNormalizationPatternConstants.VIOLATION_MESSAGES
          .NO_ENTITY_ADAPTER
      ).toBe('@ngrx/entity adapters are not being used');
    });

    it('should have NO_NORMALIZATION_PATTERNS message', () => {
      expect(
        NgRxStateNormalizationPatternConstants.VIOLATION_MESSAGES
          .NO_NORMALIZATION_PATTERNS
      ).toBe('Normalization patterns are not implemented');
    });

    it('should have NESTED_STATE_DETECTED message', () => {
      expect(
        NgRxStateNormalizationPatternConstants.VIOLATION_MESSAGES
          .NESTED_STATE_DETECTED
      ).toBe('Nested state detected');
    });

    it('should have NO_SELECTOR_COMPOSITION message', () => {
      expect(
        NgRxStateNormalizationPatternConstants.VIOLATION_MESSAGES
          .NO_SELECTOR_COMPOSITION
      ).toBe('Selectors do not follow best practices');
    });

    it('should have INCONSISTENT_STATE_SHAPES message', () => {
      expect(
        NgRxStateNormalizationPatternConstants.VIOLATION_MESSAGES
          .INCONSISTENT_STATE_SHAPES
      ).toBe('Inconsistent state shapes');
    });
  });

  describe('SUGGESTION_MESSAGES', () => {
    it('should have USE_ENTITY_ADAPTER suggestion', () => {
      expect(
        NgRxStateNormalizationPatternConstants.SUGGESTION_MESSAGES
          .USE_ENTITY_ADAPTER
      ).toBe('Use @ngrx/entity EntityAdapter');
    });

    it('should have IMPLEMENT_FLAT_STATE suggestion', () => {
      expect(
        NgRxStateNormalizationPatternConstants.SUGGESTION_MESSAGES
          .IMPLEMENT_FLAT_STATE
      ).toBe('Implement flat, normalized state');
    });

    it('should have FLATTEN_STATE suggestion', () => {
      expect(
        NgRxStateNormalizationPatternConstants.SUGGESTION_MESSAGES.FLATTEN_STATE
      ).toBe('Flatten the nested state');
    });

    it('should have USE_ENTITY_SELECTORS suggestion', () => {
      expect(
        NgRxStateNormalizationPatternConstants.SUGGESTION_MESSAGES
          .USE_ENTITY_SELECTORS
      ).toBe('Compose selectors with entity selectors');
    });

    it('should have STANDARDIZE_STATE_SHAPES suggestion', () => {
      expect(
        NgRxStateNormalizationPatternConstants.SUGGESTION_MESSAGES
          .STANDARDIZE_STATE_SHAPES
      ).toBe('Standardize state shapes');
    });
  });

  describe('SCORE_DEDUCTIONS', () => {
    it('should have NO_ENTITY_ADAPTER deduction of 30', () => {
      expect(
        NgRxStateNormalizationPatternConstants.SCORE_DEDUCTIONS
          .NO_ENTITY_ADAPTER
      ).toBe(30);
    });

    it('should have NO_NORMALIZATION_PATTERNS deduction of 25', () => {
      expect(
        NgRxStateNormalizationPatternConstants.SCORE_DEDUCTIONS
          .NO_NORMALIZATION_PATTERNS
      ).toBe(25);
    });

    it('should have NESTED_STATE_DETECTED deduction of 20', () => {
      expect(
        NgRxStateNormalizationPatternConstants.SCORE_DEDUCTIONS
          .NESTED_STATE_DETECTED
      ).toBe(20);
    });

    it('should have NO_SELECTOR_COMPOSITION deduction of 15', () => {
      expect(
        NgRxStateNormalizationPatternConstants.SCORE_DEDUCTIONS
          .NO_SELECTOR_COMPOSITION
      ).toBe(15);
    });

    it('should have INCONSISTENT_STATE_SHAPES deduction of 10', () => {
      expect(
        NgRxStateNormalizationPatternConstants.SCORE_DEDUCTIONS
          .INCONSISTENT_STATE_SHAPES
      ).toBe(10);
    });
  });

  describe('hasEntityAdapter', () => {
    it('should return true when createEntityAdapter is present', () => {
      const content = 'const adapter = createEntityAdapter<User>();';
      expect(
        NgRxStateNormalizationPatternConstants.hasEntityAdapter(content)
      ).toBe(true);
    });

    it('should return true when EntityAdapter is present', () => {
      const content = 'adapter: EntityAdapter<User>';
      expect(
        NgRxStateNormalizationPatternConstants.hasEntityAdapter(content)
      ).toBe(true);
    });

    it('should return false when neither is present', () => {
      const content = 'const users = [];';
      expect(
        NgRxStateNormalizationPatternConstants.hasEntityAdapter(content)
      ).toBe(false);
    });
  });

  describe('hasNestedState', () => {
    it('should return true for deeply nested state', () => {
      const content = 'user: { profile: { settings: {';
      expect(
        NgRxStateNormalizationPatternConstants.hasNestedState(content)
      ).toBe(true);
    });

    it('should return true for user with nested profile', () => {
      const content = 'user: { name: "test", profile: {';
      expect(
        NgRxStateNormalizationPatternConstants.hasNestedState(content)
      ).toBe(true);
    });

    it('should return true for arrays in state', () => {
      const content = 'users: User[]';
      expect(
        NgRxStateNormalizationPatternConstants.hasNestedState(content)
      ).toBe(true);
    });

    it('should return false for flat state', () => {
      const content = 'loading: boolean';
      expect(
        NgRxStateNormalizationPatternConstants.hasNestedState(content)
      ).toBe(false);
    });
  });

  describe('hasSelectorCompositionIssues', () => {
    it('should return true when createSelector with manual access', () => {
      const content = 'createSelector(selectState, state => state.entities)';
      expect(
        NgRxStateNormalizationPatternConstants.hasSelectorCompositionIssues(
          content
        )
      ).toBe(true);
    });

    it('should return false when no createSelector', () => {
      const content = 'state.entities';
      expect(
        NgRxStateNormalizationPatternConstants.hasSelectorCompositionIssues(
          content
        )
      ).toBe(false);
    });
  });

  describe('followsNormalizationPatterns', () => {
    it('should return true for flat state with ids and entities', () => {
      const content = 'ids: number[]\nentities: {';
      expect(
        NgRxStateNormalizationPatternConstants.followsNormalizationPatterns(
          content
        )
      ).toBe(true);
    });

    it('should return true for entity adapter usage without nesting', () => {
      const content = 'createEntityAdapter<User>();\nloading: boolean';
      expect(
        NgRxStateNormalizationPatternConstants.followsNormalizationPatterns(
          content
        )
      ).toBe(true);
    });

    it('should return false for entity adapter with nested state', () => {
      const content =
        'createEntityAdapter<User>()\nuser: { profile: { settings: {';
      expect(
        NgRxStateNormalizationPatternConstants.followsNormalizationPatterns(
          content
        )
      ).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should have consistent VIOLATION_MESSAGES', () => {
      expect(
        Object.keys(NgRxStateNormalizationPatternConstants.VIOLATION_MESSAGES)
      ).toEqual([
        'NO_ENTITY_ADAPTER',
        'NO_NORMALIZATION_PATTERNS',
        'NESTED_STATE_DETECTED',
        'NO_SELECTOR_COMPOSITION',
        'INCONSISTENT_STATE_SHAPES',
      ]);
    });

    it('should have consistent SUGGESTION_MESSAGES', () => {
      expect(
        Object.keys(NgRxStateNormalizationPatternConstants.SUGGESTION_MESSAGES)
      ).toEqual([
        'USE_ENTITY_ADAPTER',
        'IMPLEMENT_FLAT_STATE',
        'FLATTEN_STATE',
        'USE_ENTITY_SELECTORS',
        'STANDARDIZE_STATE_SHAPES',
      ]);
    });

    it('should have consistent SCORE_DEDUCTIONS', () => {
      expect(
        Object.keys(NgRxStateNormalizationPatternConstants.SCORE_DEDUCTIONS)
      ).toEqual([
        'NO_ENTITY_ADAPTER',
        'NO_NORMALIZATION_PATTERNS',
        'NESTED_STATE_DETECTED',
        'NO_SELECTOR_COMPOSITION',
        'INCONSISTENT_STATE_SHAPES',
      ]);
    });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    await new Promise(resolve => setTimeout(resolve, 50));
  });
});
