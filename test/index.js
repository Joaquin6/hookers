var fs = require('fs');
var path = require('path');
var expect = require('expect');
var mock = require('mock-fs');
var gitvcs = require('../src');

var gitDir = '/.git';

function readHook(hookPath) {
	return fs.readFileSync(path.join(gitDir, hookPath), 'utf-8');
}

function exists(hookPath) {
	return fs.existsSync(path.join(gitDir, hookPath));
}

describe('git-vcs', function() {
	afterEach(function() {
		mock.restore();
	});

	it('should support basic layout', function() {
		mock({
			'/.git/hooks': {},
			'/node_modules/git-vcs': {}
		});

		gitvcs.installFrom('/node_modules/git-vcs');
		var hook = readHook('hooks/pre-commit');

		expect(hook).toInclude('#git-vcs');
		expect(hook).toInclude('cd .');
		expect(hook).toInclude('npm run precommit');

		gitvcs.uninstallFrom('/node_modules/git-vcs');
		expect(exists('hooks/pre-push')).toBeFalsy();
	});

	it('should support project installed in sub directory', function() {
		mock({
			'/.git/hooks': {},
			'/A/B/node_modules/git-vcs': {}
		});

		gitvcs.installFrom('/A/B/node_modules/git-vcs');
		var hook = readHook('hooks/pre-commit');

		expect(hook).toInclude('cd A/B');

		gitvcs.uninstallFrom('/A/B/node_modules/git-vcs');
		expect(exists('hooks/pre-push')).toBeFalsy();
	});

	it('should support git submodule', function() {
		mock({
			'/.git/modules/A/B': {},
			'/A/B/.git': 'git: ../../.git/modules/A/B',
			'/A/B/node_modules/git-vcs': {}
		});

		gitvcs.installFrom('/A/B/node_modules/git-vcs');
		var hook = readHook('modules/A/B/hooks/pre-commit');

		expect(hook).toInclude('cd .');

		gitvcs.uninstallFrom('/A/B/node_modules/git-vcs');
		expect(exists('hooks/pre-push')).toBeFalsy();
	});

	it('should support git submodule and sub directory', function() {
		mock({
			'/.git/modules/A/B': {},
			'/A/B/.git': 'git: ../../.git/modules/A/B',
			'/A/B/C/node_modules/git-vcs': {}
		});

		gitvcs.installFrom('/A/B/C/node_modules/git-vcs');
		var hook = readHook('modules/A/B/hooks/pre-commit');

		expect(hook).toInclude('cd C');

		gitvcs.uninstallFrom('/A/B/app/node_modules/git-vcs');
		expect(exists('hooks/pre-push')).toBeFalsy();
	});

	it('should not modify user hooks', function() {
		mock({
			'/.git/hooks': {},
			'/.git/hooks/pre-push': 'foo',
			'/node_modules/git-vcs': {}
		});

		// Verify that it's not overwritten
		gitvcs.installFrom('/node_modules/git-vcs');
		var hook = readHook('hooks/pre-push');
		expect(hook).toBe('foo');

		gitvcs.uninstallFrom('/node_modules/git-vcs');
		expect(exists('hooks/pre-push')).toBeTruthy();
	});

	it('should not install from /node_modules/A/node_modules', function() {
		mock({
			'/.git/hooks': {},
			'/node_modules/A/node_modules/git-vcs': {}
		});

		gitvcs.installFrom('/node_modules/A/node_modules/git-vcs');
		expect(exists('hooks/pre-push')).toBeFalsy();
	});

	it('should not crash if there\'s no .git directory', function() {
		mock({
			'/node_modules/git-vcs': {}
		});

		expect(function() {
			gitvcs.installFrom('/node_modules/git-vcs');
		}).toNotThrow();

		expect(function() {
			gitvcs.uninstallFrom('/node_modules/git-vcs');
		}).toNotThrow();
	});

	it('should migrate ghooks scripts', function() {
		mock({
			'/.git/hooks/pre-commit': '// Generated by ghooks. Do not edit this file.',
			'/node_modules/git-vcs': {}
		});

		gitvcs.installFrom('/node_modules/git-vcs');
		var hook = readHook('hooks/pre-commit');
		expect(hook).toInclude('git-vcs');
		expect(hook).toNotInclude('ghooks');
	});
});