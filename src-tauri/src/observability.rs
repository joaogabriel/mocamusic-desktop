pub fn init() -> Option<sentry::ClientInitGuard> {
    let dsn = option_env!("SENTRY_DSN")?;
    if dsn.is_empty() {
        return None;
    }
    let guard = sentry::init((
        dsn,
        sentry::ClientOptions {
            release: sentry::release_name!(),
            environment: Some(
                if cfg!(debug_assertions) {
                    "development"
                } else {
                    "production"
                }
                .into(),
            ),
            ..Default::default()
        },
    ));
    Some(guard)
}

pub fn capture_error(error: &dyn std::error::Error) {
    sentry::capture_error(error);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fmt;

    #[derive(Debug)]
    struct TestError;

    impl fmt::Display for TestError {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            write!(f, "test error")
        }
    }

    impl std::error::Error for TestError {}

    #[test]
    fn init_does_not_panic() {
        let _guard = init();
    }

    #[test]
    fn init_returns_none_when_dsn_is_not_set() {
        // option_env!("SENTRY_DSN") is resolved at compile time.
        // In dev/CI without SENTRY_DSN, init() must return None (no-op).
        if option_env!("SENTRY_DSN").map_or(true, |v| v.is_empty()) {
            assert!(init().is_none());
        }
    }

    #[test]
    fn capture_error_does_not_panic() {
        capture_error(&TestError);
    }
}
