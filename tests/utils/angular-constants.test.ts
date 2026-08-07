/**
 * Angular Constants Tests
 * Tests for the angular-constants utility module
 */
import { ANGULAR_CONSTANTS } from '../../src/utils/angular-constants';

describe('angular-constants', () => {
  describe('ANGULAR_CONSTANTS file paths and directories', () => {
    it('should have Angular config path', () => {
      expect(ANGULAR_CONSTANTS.ANGULAR_JSON).toBe('angular.json');
    });

    it('should have directory names', () => {
      expect(ANGULAR_CONSTANTS.SRC_DIR).toBe('src');
      expect(ANGULAR_CONSTANTS.ENVIRONMENTS_DIR).toBe('environments');
      expect(ANGULAR_CONSTANTS.APP_DIR).toBe('app');
      expect(ANGULAR_CONSTANTS.ASSETS_DIR).toBe('assets');
      expect(ANGULAR_CONSTANTS.STYLES_DIR).toBe('styles');
    });

    it('should have file extensions', () => {
      expect(ANGULAR_CONSTANTS.COMPONENT_TS).toBe('.component.ts');
      expect(ANGULAR_CONSTANTS.COMPONENT_HTML).toBe('.component.html');
      expect(ANGULAR_CONSTANTS.SERVICE_TS).toBe('.service.ts');
      expect(ANGULAR_CONSTANTS.DIRECTIVE_TS).toBe('.directive.ts');
    });

    it('should have main Angular files', () => {
      expect(ANGULAR_CONSTANTS.MAIN_TS).toBe('main.ts');
      expect(ANGULAR_CONSTANTS.POLYFILLS_TS).toBe('polyfills.ts');
      expect(ANGULAR_CONSTANTS.INDEX_HTML).toBe('index.html');
      expect(ANGULAR_CONSTANTS.INDEX_TS).toBe('index.ts');
    });

    it('should have environment files', () => {
      expect(ANGULAR_CONSTANTS.ENVIRONMENT_TS).toBe('environment.ts');
      expect(ANGULAR_CONSTANTS.ENVIRONMENT_PROD_TS).toBe('environment.prod.ts');
    });
  });

  describe('ANGULAR_CONSTANTS module keywords', () => {
    it('should have NgModule keywords', () => {
      expect(ANGULAR_CONSTANTS.NG_MODULE).toBe('@NgModule');
      expect(ANGULAR_CONSTANTS.IMPORTS).toBe('imports:');
      expect(ANGULAR_CONSTANTS.PROVIDERS).toBe('providers:');
    });

    it('should have common modules', () => {
      expect(ANGULAR_CONSTANTS.COMMON_MODULE).toBe('CommonModule');
      expect(ANGULAR_CONSTANTS.BROWSER_MODULE).toBe('BrowserModule');
    });

    it('should have standalone component keyword', () => {
      expect(ANGULAR_CONSTANTS.STANDALONE_TRUE).toBe('standalone: true');
    });

    it('should have routing keywords', () => {
      expect(ANGULAR_CONSTANTS.LOAD_CHILDREN).toBe('loadChildren');
      expect(ANGULAR_CONSTANTS.ROUTER_MODULE_FOR_CHILD).toBe(
        'RouterModule.forChild'
      );
      expect(ANGULAR_CONSTANTS.CONST_ROUTES).toBe('const routes');
    });

    it('should have module naming patterns', () => {
      expect(ANGULAR_CONSTANTS.ROUTING_SUFFIX).toBe('-routing.module.ts');
      expect(ANGULAR_CONSTANTS.ROUTING_ALT_SUFFIX).toBe('.routing.ts');
      expect(ANGULAR_CONSTANTS.MODULE_SUFFIX).toBe('Module');
      expect(ANGULAR_CONSTANTS.MODULE_DOT).toBe('.module');
    });

    it('should have dependency injection patterns', () => {
      expect(ANGULAR_CONSTANTS.PROVIDED_IN_ROOT).toBe("providedIn: 'root'");
    });
  });

  describe('ANGULAR_CONSTANTS validation keywords', () => {
    it('should have validator types', () => {
      expect(ANGULAR_CONSTANTS.VALIDATOR_FN).toBe('ValidatorFn');
      expect(ANGULAR_CONSTANTS.ASYNC_VALIDATOR_FN).toBe('AsyncValidatorFn');
      expect(ANGULAR_CONSTANTS.VALIDATION_ERRORS).toBe('ValidationErrors');
      expect(ANGULAR_CONSTANTS.ABSTRACT_CONTROL).toBe('AbstractControl');
    });

    it('should have form control keywords', () => {
      expect(ANGULAR_CONSTANTS.FORM_CONTROL).toBe('FormControl');
      expect(ANGULAR_CONSTANTS.FORM_GROUP).toBe('FormGroup');
      expect(ANGULAR_CONSTANTS.VALIDATORS_DOT).toBe('Validators.');
      expect(ANGULAR_CONSTANTS.VALIDATORS_REQUIRED).toBe('Validators.required');
      expect(ANGULAR_CONSTANTS.VALIDATORS_EMAIL).toBe('Validators.email');
    });

    it('should have form state keywords', () => {
      expect(ANGULAR_CONSTANTS.HAS_ERROR).toBe('hasError');
      expect(ANGULAR_CONSTANTS.ERRORS).toBe('errors');
      expect(ANGULAR_CONSTANTS.INVALID).toBe('invalid');
      expect(ANGULAR_CONSTANTS.REQUIRED).toBe('required');
      expect(ANGULAR_CONSTANTS.EMAIL).toBe('email');
    });
  });

  describe('ANGULAR_CONSTANTS validation messages', () => {
    it('should have validation suggestion messages', () => {
      expect(ANGULAR_CONSTANTS.MSG_REQUIRED_VALIDATION).toContain(
        'required validation'
      );
      expect(ANGULAR_CONSTANTS.MSG_EMAIL_VALIDATION).toContain(
        'Validators.email'
      );
      expect(ANGULAR_CONSTANTS.MSG_TEMPLATE_ERROR_DISPLAY).toContain(
        'validation errors'
      );
    });
  });

  describe('ANGULAR_CONSTANTS RxJS operators', () => {
    it('should have common operators', () => {
      expect(ANGULAR_CONSTANTS.TAP).toBe('tap');
      expect(ANGULAR_CONSTANTS.CATCH_ERROR).toBe('catchError');
      expect(ANGULAR_CONSTANTS.SWITCH_MAP).toBe('switchMap');
      expect(ANGULAR_CONSTANTS.EXHAUST_MAP).toBe('exhaustMap');
      expect(ANGULAR_CONSTANTS.MAP).toBe('map');
      expect(ANGULAR_CONSTANTS.PIPE).toBe('pipe');
      expect(ANGULAR_CONSTANTS.FINALIZE).toBe('finalize');
    });

    it('should have retry operators', () => {
      expect(ANGULAR_CONSTANTS.TIMEOUT).toBe('timeout');
      expect(ANGULAR_CONSTANTS.RETRY).toBe('retry');
      expect(ANGULAR_CONSTANTS.RETRY_WHEN).toBe('retryWhen');
    });

    it('should have deprecated operators', () => {
      expect(ANGULAR_CONSTANTS.DEPRECATED_DO).toBe('do');
      expect(ANGULAR_CONSTANTS.DEPRECATED_CATCH).toBe('catch');
      expect(ANGULAR_CONSTANTS.DEPRECATED_FINALLY).toBe('finally');
    });
  });

  describe('ANGULAR_CONSTANTS HTTP methods', () => {
    it('should have HTTP method constants', () => {
      expect(ANGULAR_CONSTANTS.HTTP_POST).toBe('POST');
      expect(ANGULAR_CONSTANTS.HTTP_PUT).toBe('PUT');
      expect(ANGULAR_CONSTANTS.HTTP_GET).toBe('GET');
      expect(ANGULAR_CONSTANTS.HTTP_DELETE).toBe('DELETE');
    });
  });

  describe('ANGULAR_CONSTANTS lifecycle hooks', () => {
    it('should have OnDestroy patterns', () => {
      expect(ANGULAR_CONSTANTS.IMPLEMENTS_ON_DESTROY).toBe(
        'implements OnDestroy'
      );
      expect(ANGULAR_CONSTANTS.NG_ON_DESTROY).toBe('ngOnDestroy');
      expect(ANGULAR_CONSTANTS.ON_DESTROY).toBe('OnDestroy');
    });
  });

  describe('ANGULAR_CONSTANTS RxJS patterns', () => {
    it('should have subscription patterns', () => {
      expect(ANGULAR_CONSTANTS.SUBSCRIBE).toBe('subscribe(');
      expect(ANGULAR_CONSTANTS.PIPE_SYNTAX).toBe('.pipe(');
      expect(ANGULAR_CONSTANTS.UNSUBSCRIBE).toBe('unsubscribe()');
      expect(ANGULAR_CONSTANTS.TAKE_UNTIL).toBe('takeUntil');
      expect(ANGULAR_CONSTANTS.DESTROY_SUBJECT).toBe('destroy$');
      expect(ANGULAR_CONSTANTS.ASYNC_PIPE).toBe('| async');
    });

    it('should have Subject patterns', () => {
      expect(ANGULAR_CONSTANTS.COMPLETE).toBe('complete()');
      expect(ANGULAR_CONSTANTS.SUBJECT).toBe('Subject');
      expect(ANGULAR_CONSTANTS.SUBSCRIPTION).toBe('subscription');
    });
  });

  describe('ANGULAR_CONSTANTS timer functions', () => {
    it('should have native timer functions', () => {
      expect(ANGULAR_CONSTANTS.SET_INTERVAL).toBe('setInterval');
      expect(ANGULAR_CONSTANTS.SET_TIMEOUT).toBe('setTimeout');
      expect(ANGULAR_CONSTANTS.CLEAR_INTERVAL).toBe('clearInterval');
      expect(ANGULAR_CONSTANTS.CLEAR_TIMEOUT).toBe('clearTimeout');
    });

    it('should have RxJS timer functions', () => {
      expect(ANGULAR_CONSTANTS.TIMER).toBe('timer(');
      expect(ANGULAR_CONSTANTS.INTERVAL).toBe('interval(');
    });
  });

  describe('ANGULAR_CONSTANTS decorators', () => {
    it('should have Angular decorators', () => {
      expect(ANGULAR_CONSTANTS.INJECTABLE).toBe('@Injectable');
      expect(ANGULAR_CONSTANTS.COMPONENT_DECORATOR).toBe('@Component');
      expect(ANGULAR_CONSTANTS.NG_MODULE_DECORATOR).toBe('@NgModule');
      expect(ANGULAR_CONSTANTS.VIEW_CHILD).toBe('@ViewChild');
    });

    it('should have constructor pattern', () => {
      expect(ANGULAR_CONSTANTS.CONSTRUCTOR).toBe('constructor(');
    });
  });

  describe('ANGULAR_CONSTANTS NgRx keywords', () => {
    it('should have effects patterns', () => {
      expect(ANGULAR_CONSTANTS.EFFECTS).toBe('effects');
      expect(ANGULAR_CONSTANTS.EFFECTS_SUFFIX).toBe('.effects.');
      expect(ANGULAR_CONSTANTS.EFFECT_SUFFIX).toBe('.effect.');
    });
  });
});
