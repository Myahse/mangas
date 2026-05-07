package com.mangafriq.tools;

import java.sql.SQLException;
import javax.sql.DataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;

/**
 * Dev tool: drops and recreates schema 'public' then exits.
 * Run it with the postgres profile so it connects to the right DB.
 */
@SpringBootApplication
@Slf4j
public class ResetDbMain {
	public static void main(String[] args) {
		try (ConfigurableApplicationContext ctx = SpringApplication.run(ResetDbMain.class, args)) {
			DataSource ds = ctx.getBean(DataSource.class);
			try (var c = ds.getConnection(); var st = c.createStatement()) {
				log.warn("Dropping and recreating schema 'public' (DEV ONLY).");
				st.execute("drop schema if exists public cascade");
				st.execute("create schema public");
				st.execute("grant all on schema public to public");
				st.execute("grant all on schema public to current_user");
				log.warn("Schema reset complete.");
			} catch (SQLException e) {
				log.error("Failed to reset schema", e);
				System.exit(1);
			}
		}
		System.exit(0);
	}
}

