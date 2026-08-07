/**
 * Naming Constants Tests
 * Tests for the naming-constants utility module
 */
import {
  NAMING_CONVENTIONS,
  NAMING_VALIDATION_MESSAGES,
} from '../../src/utils/naming-constants';

describe('naming-constants', () => {
  describe('NAMING_CONVENTIONS case patterns', () => {
    describe('CAMEL_CASE_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.CAMEL_CASE_PATTERN;

      it('should match valid camelCase strings', () => {
        expect(pattern.test('userName')).toBe(true);
        expect(pattern.test('firstName')).toBe(true);
        expect(pattern.test('myVar123')).toBe(true);
        expect(pattern.test('x')).toBe(true);
      });

      it('should not match invalid strings', () => {
        expect(pattern.test('UserName')).toBe(false); // PascalCase
        expect(pattern.test('user_name')).toBe(false); // snake_case
        expect(pattern.test('user-name')).toBe(false); // kebab-case
        expect(pattern.test('123abc')).toBe(false); // starts with number
      });
    });

    describe('PASCAL_CASE_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.PASCAL_CASE_PATTERN;

      it('should match valid PascalCase strings', () => {
        expect(pattern.test('UserName')).toBe(true);
        expect(pattern.test('FirstName')).toBe(true);
        expect(pattern.test('MyClass123')).toBe(true);
        expect(pattern.test('X')).toBe(true);
      });

      it('should not match invalid strings', () => {
        expect(pattern.test('userName')).toBe(false); // camelCase
        expect(pattern.test('User_Name')).toBe(false); // with underscore
        expect(pattern.test('user-name')).toBe(false); // kebab-case
      });
    });

    describe('KEBAB_CASE_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.KEBAB_CASE_PATTERN;

      it('should match valid kebab-case strings', () => {
        expect(pattern.test('user-name')).toBe(true);
        expect(pattern.test('my-component')).toBe(true);
        expect(pattern.test('test123')).toBe(true);
        expect(pattern.test('component-1')).toBe(true);
      });

      it('should not match invalid strings', () => {
        expect(pattern.test('userName')).toBe(false); // camelCase
        expect(pattern.test('User-Name')).toBe(false); // PascalCase with dash
        expect(pattern.test('user_name')).toBe(false); // snake_case
        expect(pattern.test('-component')).toBe(false); // starts with dash
      });
    });

    describe('SNAKE_CASE_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.SNAKE_CASE_PATTERN;

      it('should match valid snake_case strings', () => {
        expect(pattern.test('user_name')).toBe(true);
        expect(pattern.test('my_variable')).toBe(true);
        expect(pattern.test('test123')).toBe(true);
        expect(pattern.test('var_1')).toBe(true);
      });

      it('should not match invalid strings', () => {
        expect(pattern.test('userName')).toBe(false); // camelCase
        expect(pattern.test('USER_NAME')).toBe(false); // SCREAMING_SNAKE_CASE
        expect(pattern.test('_name')).toBe(false); // starts with underscore
      });
    });

    describe('SCREAMING_SNAKE_CASE_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.SCREAMING_SNAKE_CASE_PATTERN;

      it('should match valid SCREAMING_SNAKE_CASE strings', () => {
        expect(pattern.test('MAX_VALUE')).toBe(true);
        expect(pattern.test('API_URL')).toBe(true);
        expect(pattern.test('TEST123')).toBe(true);
        expect(pattern.test('A')).toBe(true);
      });

      it('should not match invalid strings', () => {
        expect(pattern.test('maxValue')).toBe(false); // camelCase
        expect(pattern.test('max_value')).toBe(false); // lowercase
        expect(pattern.test('_VALUE')).toBe(false); // starts with underscore
      });
    });
  });

  describe('NAMING_CONVENTIONS file patterns', () => {
    describe('COMPONENT_FILE_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.COMPONENT_FILE_PATTERN;

      it('should match valid component files', () => {
        expect(pattern.test('user-profile.component.ts')).toBe(true);
        expect(pattern.test('app.component.html')).toBe(true);
        expect(pattern.test('my-component.component.scss')).toBe(true);
        expect(pattern.test('test.component.css')).toBe(true);
      });

      it('should not match invalid files', () => {
        expect(pattern.test('UserProfile.component.ts')).toBe(false);
        expect(pattern.test('user-profile.service.ts')).toBe(false);
        expect(pattern.test('component.ts')).toBe(false);
      });
    });

    describe('SERVICE_FILE_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.SERVICE_FILE_PATTERN;

      it('should match valid service files', () => {
        expect(pattern.test('user.service.ts')).toBe(true);
        expect(pattern.test('auth-api.service.ts')).toBe(true);
        expect(pattern.test('data123.service.ts')).toBe(true);
      });

      it('should not match invalid files', () => {
        expect(pattern.test('User.service.ts')).toBe(false);
        expect(pattern.test('user.component.ts')).toBe(false);
      });
    });
  });

  describe('NAMING_CONVENTIONS class patterns', () => {
    describe('COMPONENT_CLASS_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.COMPONENT_CLASS_PATTERN;

      it('should match valid component class names', () => {
        expect(pattern.test('UserProfileComponent')).toBe(true);
        expect(pattern.test('AppComponent')).toBe(true);
        expect(pattern.test('HeaderComponent')).toBe(true);
      });

      it('should not match invalid class names', () => {
        expect(pattern.test('userProfileComponent')).toBe(false);
        expect(pattern.test('UserProfile')).toBe(false);
        expect(pattern.test('Component')).toBe(false);
      });
    });

    describe('SERVICE_CLASS_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.SERVICE_CLASS_PATTERN;

      it('should match valid service class names', () => {
        expect(pattern.test('UserService')).toBe(true);
        expect(pattern.test('AuthApiService')).toBe(true);
        expect(pattern.test('DataService')).toBe(true);
      });

      it('should not match invalid class names', () => {
        expect(pattern.test('userService')).toBe(false);
        expect(pattern.test('Service')).toBe(false);
      });
    });
  });

  describe('NAMING_CONVENTIONS NgRx patterns', () => {
    describe('ACTION_TYPE_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.ACTION_TYPE_PATTERN;

      it('should match valid action types', () => {
        expect(pattern.test('[User] Load Users')).toBe(true);
        expect(pattern.test('[Auth API] Login Success')).toBe(true);
        expect(pattern.test('[Products] Add Product')).toBe(true);
      });

      it('should not match invalid action types', () => {
        expect(pattern.test('Load Users')).toBe(false);
        expect(pattern.test('[] Action')).toBe(false);
        expect(pattern.test('[User]')).toBe(false);
      });
    });

    describe('EFFECT_NAME_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.EFFECT_NAME_PATTERN;

      it('should match valid effect names', () => {
        expect(pattern.test('loadUsers$')).toBe(true);
        expect(pattern.test('saveData$')).toBe(true);
        expect(pattern.test('fetchApi123$')).toBe(true);
      });

      it('should not match invalid effect names', () => {
        expect(pattern.test('loadUsers')).toBe(false); // no $
        expect(pattern.test('LoadUsers$')).toBe(false); // PascalCase
        expect(pattern.test('$loadUsers')).toBe(false); // $ at start
      });
    });

    describe('SELECTOR_NAME_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.SELECTOR_NAME_PATTERN;

      it('should match valid selector names', () => {
        expect(pattern.test('selectUsers')).toBe(true);
        expect(pattern.test('selectAllProducts')).toBe(true);
        expect(pattern.test('selectUserId123')).toBe(true);
      });

      it('should not match invalid selector names', () => {
        expect(pattern.test('getUsers')).toBe(false);
        expect(pattern.test('selectusers')).toBe(false); // no uppercase after select
        expect(pattern.test('SelectUsers')).toBe(false); // PascalCase
      });
    });
  });

  describe('NAMING_CONVENTIONS arrays and objects', () => {
    it('should have allowed short names', () => {
      expect(NAMING_CONVENTIONS.ALLOWED_SHORT_NAMES).toContain('i');
      expect(NAMING_CONVENTIONS.ALLOWED_SHORT_NAMES).toContain('j');
      expect(NAMING_CONVENTIONS.ALLOWED_SHORT_NAMES).toContain('id');
      expect(NAMING_CONVENTIONS.ALLOWED_SHORT_NAMES).toContain('url');
    });

    it('should have common exceptions', () => {
      expect(NAMING_CONVENTIONS.COMMON_EXCEPTIONS).toContain('window');
      expect(NAMING_CONVENTIONS.COMMON_EXCEPTIONS).toContain('document');
      expect(NAMING_CONVENTIONS.COMMON_EXCEPTIONS).toContain('console');
    });

    it('should have Angular lifecycle hooks', () => {
      expect(NAMING_CONVENTIONS.ANGULAR_LIFECYCLE).toContain('ngOnInit');
      expect(NAMING_CONVENTIONS.ANGULAR_LIFECYCLE).toContain('ngOnDestroy');
      expect(NAMING_CONVENTIONS.ANGULAR_LIFECYCLE).toContain('ngAfterViewInit');
    });

    it('should have analysis thresholds', () => {
      expect(NAMING_CONVENTIONS.ANALYSIS_THRESHOLDS.MAX_FILES_TO_ANALYZE).toBe(
        100
      );
      expect(
        NAMING_CONVENTIONS.ANALYSIS_THRESHOLDS.MAX_VIOLATIONS_PER_FILE
      ).toBe(10);
    });

    it('should have common suffixes', () => {
      expect(NAMING_CONVENTIONS.SUFFIXES.COMPONENT).toBe('Component');
      expect(NAMING_CONVENTIONS.SUFFIXES.SERVICE).toBe('Service');
      expect(NAMING_CONVENTIONS.SUFFIXES.MODULE).toBe('Module');
    });

    it('should have common prefixes', () => {
      expect(NAMING_CONVENTIONS.PREFIXES.INTERFACE).toBe('I');
      expect(NAMING_CONVENTIONS.PREFIXES.ABSTRACT).toBe('Abstract');
      expect(NAMING_CONVENTIONS.PREFIXES.MOCK).toBe('Mock');
    });

    it('should have file extension arrays', () => {
      expect(NAMING_CONVENTIONS.TYPESCRIPT_EXTENSIONS).toContain('.ts');
      expect(NAMING_CONVENTIONS.TYPESCRIPT_EXTENSIONS).toContain('.tsx');
      expect(NAMING_CONVENTIONS.STYLE_EXTENSIONS).toContain('.scss');
    });
  });

  describe('NAMING_CONVENTIONS special patterns', () => {
    it('should have barrel file name', () => {
      expect(NAMING_CONVENTIONS.BARREL_FILE).toBe('index.ts');
    });

    it('should have public API file name', () => {
      expect(NAMING_CONVENTIONS.PUBLIC_API_FILE).toBe('public-api.ts');
    });

    describe('ENVIRONMENT_FILE_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.ENVIRONMENT_FILE_PATTERN;

      it('should match environment files', () => {
        expect(pattern.test('environment.ts')).toBe(true);
        expect(pattern.test('environment.prod.ts')).toBe(true);
        expect(pattern.test('environment.development.ts')).toBe(true);
      });
    });

    describe('SPEC_FILE_PATTERN', () => {
      const pattern = NAMING_CONVENTIONS.SPEC_FILE_PATTERN;

      it('should match spec files', () => {
        expect(pattern.test('user.service.spec.ts')).toBe(true);
        expect(pattern.test('app.component.spec.ts')).toBe(true);
      });

      it('should not match non-spec files', () => {
        expect(pattern.test('user.service.ts')).toBe(false);
      });
    });
  });

  describe('NAMING_VALIDATION_MESSAGES', () => {
    it('should have file naming messages', () => {
      expect(
        NAMING_VALIDATION_MESSAGES.FILE_NAMING.INVALID_COMPONENT_NAME
      ).toContain('Component file');
      expect(
        NAMING_VALIDATION_MESSAGES.FILE_NAMING.INVALID_SERVICE_NAME
      ).toContain('Service file');
    });

    it('should have class naming messages', () => {
      expect(
        NAMING_VALIDATION_MESSAGES.CLASS_NAMING.INVALID_COMPONENT_CLASS
      ).toContain('Component class');
      expect(
        NAMING_VALIDATION_MESSAGES.CLASS_NAMING.INVALID_SERVICE_CLASS
      ).toContain('Service class');
    });

    it('should have variable naming messages', () => {
      expect(
        NAMING_VALIDATION_MESSAGES.VARIABLE_NAMING.INVALID_VARIABLE_CASE
      ).toContain('Variable');
      expect(
        NAMING_VALIDATION_MESSAGES.VARIABLE_NAMING.INVALID_CONSTANT_CASE
      ).toContain('Constant');
    });
  });
});
