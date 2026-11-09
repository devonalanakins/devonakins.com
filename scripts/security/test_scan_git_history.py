import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCANNER = Path(__file__).with_name('scan-git-history.py').resolve()


class HistoryScanTest(unittest.TestCase):
    def test_deleted_synthetic_token_is_detected_without_printing_it(self):
        with tempfile.TemporaryDirectory() as temp:
            env = dict(os.environ, GIT_CONFIG_NOSYSTEM='1', GIT_AUTHOR_NAME='Fixture',
                       GIT_AUTHOR_EMAIL='fixture@example.test', GIT_COMMITTER_NAME='Fixture',
                       GIT_COMMITTER_EMAIL='fixture@example.test')
            def git(*args):
                return subprocess.run(['git', *args], cwd=temp, env=env, check=True,
                                      stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            git('init', '-q')
            token = 'gh' + 'p_' + 'A' * 36
            Path(temp, 'example.txt').write_text(token)
            git('add', 'example.txt'); git('commit', '-qm', 'synthetic fixture')
            Path(temp, 'example.txt').write_text('clean')
            git('add', 'example.txt'); git('commit', '-qm', 'remove fixture')
            result = subprocess.run([sys.executable, str(SCANNER)], cwd=temp, env=env,
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 1)
            self.assertIn('github-token', result.stdout)
            self.assertNotIn(token, result.stdout + result.stderr)

    def test_exact_known_inert_fixture_is_exempt_but_other_assignments_are_detected(self):
        with tempfile.TemporaryDirectory() as temp:
            env = dict(os.environ, GIT_CONFIG_NOSYSTEM='1', GIT_AUTHOR_NAME='Fixture',
                       GIT_AUTHOR_EMAIL='fixture@example.test', GIT_COMMITTER_NAME='Fixture',
                       GIT_COMMITTER_EMAIL='fixture@example.test')
            subprocess.run(['git', 'init', '-q'], cwd=temp, env=env, check=True)
            known = 'access_token: "placeholder_access_12345"' + '\\n' + "OPENAI_API_KEY:'should-never-be-forwarded'"
            Path(temp, 'example.txt').write_text(known)
            subprocess.run(['git', 'add', '.'], cwd=temp, env=env, check=True)
            subprocess.run(['git', 'commit', '-qm', 'known inert test example'], cwd=temp, env=env, check=True)
            clean = subprocess.run([sys.executable, str(SCANNER)], cwd=temp, env=env,
                                   capture_output=True, text=True)
            self.assertEqual(clean.returncode, 0, clean.stdout + clean.stderr)
            unknown = 'access_token: ' + chr(34) + 'unknown_' + ('B' * 35) + chr(34)
            Path(temp, 'example.txt').write_text(known + '\\n' + unknown)
            subprocess.run(['git', 'add', '.'], cwd=temp, env=env, check=True)
            subprocess.run(['git', 'commit', '-qm', 'add different synthetic credential'], cwd=temp, env=env, check=True)
            flagged = subprocess.run([sys.executable, str(SCANNER)], cwd=temp, env=env,
                                     capture_output=True, text=True)
            self.assertEqual(flagged.returncode, 1, flagged.stdout + flagged.stderr)
            self.assertIn('sensitive-assignment', flagged.stdout)
            self.assertNotIn(unknown, flagged.stdout + flagged.stderr)

    def test_only_exact_historical_inert_assignment_is_exempt(self):
        with tempfile.TemporaryDirectory() as temp:
            env = dict(os.environ, GIT_CONFIG_NOSYSTEM='1', GIT_AUTHOR_NAME='Fixture',
                       GIT_AUTHOR_EMAIL='fixture@example.test', GIT_COMMITTER_NAME='Fixture',
                       GIT_COMMITTER_EMAIL='fixture@example.test')
            def git(*args):
                subprocess.run(['git', *args], cwd=temp, env=env, check=True,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            git('init', '-q')
            exact = "OPENAI_API_KEY:'should-never-be-forwarded'"
            Path(temp, 'key.js').write_text(exact)
            git('add', '.'); git('commit', '-qm', 'historical inert fixture')
            safe = subprocess.run([sys.executable, str(SCANNER)], cwd=temp, env=env,
                                  capture_output=True, text=True)
            self.assertEqual(safe.returncode, 0, safe.stdout + safe.stderr)
            near = "OPENAI_API" + "_KEY:'should-never-be-forwardeX'"
            Path(temp, 'key.js').write_text(near)
            git('add', '.'); git('commit', '-qm', 'non-exempt long key assignment')
            flagged = subprocess.run([sys.executable, str(SCANNER)], cwd=temp, env=env,
                                     capture_output=True, text=True)
            self.assertEqual(flagged.returncode, 1, flagged.stdout + flagged.stderr)
            self.assertIn('sensitive-assignment', flagged.stdout)
            self.assertNotIn(near, flagged.stdout + flagged.stderr)

    def test_clean_history_and_binary_are_reported(self):
        with tempfile.TemporaryDirectory() as temp:
            env = dict(os.environ, GIT_CONFIG_NOSYSTEM='1', GIT_AUTHOR_NAME='Fixture',
                       GIT_AUTHOR_EMAIL='fixture@example.test', GIT_COMMITTER_NAME='Fixture',
                       GIT_COMMITTER_EMAIL='fixture@example.test')
            subprocess.run(['git', 'init', '-q'], cwd=temp, env=env, check=True)
            Path(temp, 'clean.txt').write_text('no credentials here')
            Path(temp, 'binary.dat').write_bytes(b'\x00\xffbinary')
            subprocess.run(['git', 'add', '.'], cwd=temp, env=env, check=True)
            subprocess.run(['git', 'commit', '-qm', 'synthetic fixture'], cwd=temp, env=env, check=True)
            result = subprocess.run([sys.executable, str(SCANNER)], cwd=temp, env=env,
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('1 binary blobs skipped', result.stdout)


if __name__ == '__main__':
    unittest.main()
