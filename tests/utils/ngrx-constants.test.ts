/**
 * NgRx Constants Tests
 * Tests for the ngrx-constants utility module
 */
import {
  NGRX_CONSTANTS,
  NGRX_VALIDATION_MESSAGES,
} from '../../src/utils/ngrx-constants';

describe('ngrx-constants', () => {
  describe('NGRX_CONSTANTS package names', () => {
    it('should have NgRx package imports', () => {
      expect(NGRX_CONSTANTS.NGRX_STORE).toBe('@ngrx/store');
      expect(NGRX_CONSTANTS.NGRX_EFFECTS).toBe('@ngrx/effects');
      expect(NGRX_CONSTANTS.NGRX_ENTITY).toBe('@ngrx/entity');
      expect(NGRX_CONSTANTS.NGRX_DEVTOOLS).toBe('@ngrx/store-devtools');
      expect(NGRX_CONSTANTS.NGRX_ROUTER_STORE).toBe('@ngrx/router-store');
      expect(NGRX_CONSTANTS.NGRX_DATA).toBe('@ngrx/data');
      expect(NGRX_CONSTANTS.NGRX_SCHEMATICS).toBe('@ngrx/schematics');
    });
  });

  describe('NGRX_CONSTANTS store configuration', () => {
    it('should have store module constants', () => {
      expect(NGRX_CONSTANTS.STORE).toBe('Store');
      expect(NGRX_CONSTANTS.STORE_MODULE).toBe('StoreModule');
      expect(NGRX_CONSTANTS.STORE_FOR_ROOT).toBe('StoreModule.forRoot');
      expect(NGRX_CONSTANTS.STORE_FOR_FEATURE).toBe('StoreModule.forFeature');
    });

    it('should have devtools constants', () => {
      expect(NGRX_CONSTANTS.STORE_DEVTOOLS_MODULE).toBe('StoreDevtoolsModule');
      expect(NGRX_CONSTANTS.STORE_DEVTOOLS_INSTRUMENT).toBe(
        'StoreDevtoolsModule.instrument'
      );
    });

    it('should have router store constants', () => {
      expect(NGRX_CONSTANTS.STORE_ROUTER_CONNECTING_MODULE).toBe(
        'StoreRouterConnectingModule'
      );
      expect(NGRX_CONSTANTS.STORE_ROUTER_FOR_ROOT).toBe(
        'StoreRouterConnectingModule.forRoot'
      );
    });
  });

  describe('NGRX_CONSTANTS effects', () => {
    it('should have effects module constants', () => {
      expect(NGRX_CONSTANTS.EFFECTS_MODULE).toBe('EffectsModule');
      expect(NGRX_CONSTANTS.EFFECTS_FOR_ROOT).toBe('EffectsModule.forRoot');
      expect(NGRX_CONSTANTS.EFFECTS_FOR_FEATURE).toBe(
        'EffectsModule.forFeature'
      );
    });

    it('should have effect creation constants', () => {
      expect(NGRX_CONSTANTS.CREATE_EFFECT).toBe('createEffect');
      expect(NGRX_CONSTANTS.ACTIONS).toBe('Actions');
      expect(NGRX_CONSTANTS.OF_TYPE).toBe('ofType');
    });
  });

  describe('NGRX_CONSTANTS entity', () => {
    it('should have entity adapter constants', () => {
      expect(NGRX_CONSTANTS.ENTITY_ADAPTER).toBe('EntityAdapter');
      expect(NGRX_CONSTANTS.ENTITY_STATE).toBe('EntityState');
      expect(NGRX_CONSTANTS.CREATE_ENTITY_ADAPTER).toBe('createEntityAdapter');
    });
  });

  describe('NGRX_CONSTANTS actions', () => {
    it('should have action creation constants', () => {
      expect(NGRX_CONSTANTS.CREATE_ACTION).toBe('createAction');
      expect(NGRX_CONSTANTS.PROPS).toBe('props');
      expect(NGRX_CONSTANTS.TYPE).toBe('type');
      expect(NGRX_CONSTANTS.PAYLOAD).toBe('payload');
    });
  });

  describe('NGRX_CONSTANTS reducers', () => {
    it('should have reducer creation constants', () => {
      expect(NGRX_CONSTANTS.CREATE_REDUCER).toBe('createReducer');
      expect(NGRX_CONSTANTS.ON).toBe('on');
      expect(NGRX_CONSTANTS.INITIAL_STATE).toBe('initialState');
      expect(NGRX_CONSTANTS.STATE).toBe('State');
    });
  });

  describe('NGRX_CONSTANTS selectors', () => {
    it('should have selector creation constants', () => {
      expect(NGRX_CONSTANTS.CREATE_SELECTOR).toBe('createSelector');
      expect(NGRX_CONSTANTS.CREATE_FEATURE_SELECTOR).toBe(
        'createFeatureSelector'
      );
      expect(NGRX_CONSTANTS.GET_SELECTORS).toBe('getSelectors');
    });
  });

  describe('NGRX_CONSTANTS router store', () => {
    it('should have router action constants', () => {
      expect(NGRX_CONSTANTS.ROUTER_NAVIGATION_ACTION).toBe('ROUTER_NAVIGATION');
      expect(NGRX_CONSTANTS.ROUTER_REQUEST_ACTION).toBe('ROUTER_REQUEST');
      expect(NGRX_CONSTANTS.ROUTER_NAVIGATED_ACTION).toBe('ROUTER_NAVIGATED');
      expect(NGRX_CONSTANTS.ROUTER_CANCEL_ACTION).toBe('ROUTER_CANCEL');
      expect(NGRX_CONSTANTS.ROUTER_ERROR_ACTION).toBe('ROUTER_ERROR');
    });
  });

  describe('NGRX_CONSTANTS file naming', () => {
    it('should have file suffix constants', () => {
      expect(NGRX_CONSTANTS.ACTIONS_SUFFIX).toBe('.actions.ts');
      expect(NGRX_CONSTANTS.REDUCER_SUFFIX).toBe('.reducer.ts');
      expect(NGRX_CONSTANTS.EFFECTS_SUFFIX).toBe('.effects.ts');
      expect(NGRX_CONSTANTS.SELECTORS_SUFFIX).toBe('.selectors.ts');
      expect(NGRX_CONSTANTS.STATE_SUFFIX).toBe('.state.ts');
    });
  });

  describe('NGRX_CONSTANTS store structure', () => {
    it('should have store structure keywords', () => {
      expect(NGRX_CONSTANTS.FEATURE_KEY).toBe('featureKey');
      expect(NGRX_CONSTANTS.SLICE_NAME).toBe('sliceName');
      expect(NGRX_CONSTANTS.NAMESPACE).toBe('namespace');
    });
  });

  describe('NGRX_CONSTANTS devtools', () => {
    it('should have devtools configuration keywords', () => {
      expect(NGRX_CONSTANTS.MAX_AGE).toBe('maxAge');
      expect(NGRX_CONSTANTS.TRACE).toBe('trace');
      expect(NGRX_CONSTANTS.TRACE_LIMIT).toBe('traceLimit');
      expect(NGRX_CONSTANTS.SERIALIZE).toBe('serialize');
    });
  });

  describe('NGRX_CONSTANTS common patterns', () => {
    it('should have common usage patterns', () => {
      expect(NGRX_CONSTANTS.DISPATCH).toBe('dispatch');
      expect(NGRX_CONSTANTS.SELECT).toBe('select');
      expect(NGRX_CONSTANTS.PIPE).toBe('pipe');
      expect(NGRX_CONSTANTS.MAP).toBe('map');
      expect(NGRX_CONSTANTS.SUBSCRIBE).toBe('subscribe');
    });
  });

  describe('NGRX_CONSTANTS testing', () => {
    it('should have testing keywords', () => {
      expect(NGRX_CONSTANTS.MOCK_STORE).toBe('MockStore');
      expect(NGRX_CONSTANTS.PROVIDE_MOCK_STORE).toBe('provideMockStore');
      expect(NGRX_CONSTANTS.TESTING_MODULE).toBe('TestingModule');
    });
  });

  describe('NGRX_CONSTANTS configuration methods', () => {
    it('should have configuration method constants', () => {
      expect(NGRX_CONSTANTS.FOR_ROOT).toBe('forRoot');
      expect(NGRX_CONSTANTS.FOR_FEATURE).toBe('forFeature');
      expect(NGRX_CONSTANTS.WITH_ROUTER_STATE).toBe('withRouterState');
    });
  });

  describe('NGRX_CONSTANTS entity operations', () => {
    it('should have entity update keywords', () => {
      expect(NGRX_CONSTANTS.UPDATE).toBe('update');
      expect(NGRX_CONSTANTS.UPSERT).toBe('upsert');
      expect(NGRX_CONSTANTS.ADD).toBe('add');
      expect(NGRX_CONSTANTS.REMOVE).toBe('remove');
      expect(NGRX_CONSTANTS.CLEAR).toBe('clear');
    });
  });

  describe('NGRX_CONSTANTS types', () => {
    it('should have common type constants', () => {
      expect(NGRX_CONSTANTS.OBSERVABLE).toBe('Observable');
      expect(NGRX_CONSTANTS.VOID).toBe('void');
      expect(NGRX_CONSTANTS.ANY).toBe('any');
      expect(NGRX_CONSTANTS.UNKNOWN).toBe('unknown');
    });
  });

  describe('NGRX_VALIDATION_MESSAGES', () => {
    describe('STORE messages', () => {
      it('should have store configuration messages', () => {
        expect(
          NGRX_VALIDATION_MESSAGES.STORE.STORE_FORROOT_NOT_FOUND
        ).toContain('StoreModule.forRoot()');
        expect(
          NGRX_VALIDATION_MESSAGES.STORE.STORE_DEVTOOLS_NOT_FOUND
        ).toContain('StoreDevtoolsModule.instrument()');
        expect(
          NGRX_VALIDATION_MESSAGES.STORE.STORE_MODULE_NOT_IMPORTED
        ).toContain('StoreModule');
      });

      it('should have effects configuration messages', () => {
        expect(
          NGRX_VALIDATION_MESSAGES.STORE.EFFECTS_MODULE_NOT_IMPORTED
        ).toContain('EffectsModule');
        expect(
          NGRX_VALIDATION_MESSAGES.STORE.EFFECTS_FORROOT_NOT_FOUND
        ).toContain('EffectsModule.forRoot()');
      });

      it('should have placeholder for file names', () => {
        expect(
          NGRX_VALIDATION_MESSAGES.STORE.STORE_FORROOT_NOT_FOUND
        ).toContain('{fileName}');
      });
    });
  });
});
