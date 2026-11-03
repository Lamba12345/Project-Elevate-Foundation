package org.elevate.config;

import org.elevate.security.AuthInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Web MVC Configuration:
 * - Registers authentication interceptor
 * - Sets up CORS for all origins
 * - Maps static resources for uploaded images and frontend website files
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;

    @Value("${elevate.upload.dir:uploads}")
    private String uploadDir;

    public WebConfig(AuthInterceptor authInterceptor) {
        this.authInterceptor = authInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Resolve upload directory
        File uploadFolder = new File(uploadDir);
        if (!uploadFolder.exists()) {
            uploadFolder.mkdirs();
        }
        String absoluteUploadPath = uploadFolder.getAbsolutePath().replace("\\", "/");
        if (!absoluteUploadPath.endsWith("/")) {
            absoluteUploadPath += "/";
        }

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + absoluteUploadPath);

        // Also allow serving static frontend pages from project directory
        File parentDir = uploadFolder.getParentFile();
        String parentPath = parentDir != null ? parentDir.getAbsolutePath().replace("\\", "/") + "/" : "";

        registry.addResourceHandler("/**")
                .addResourceLocations(
                        "file:./",
                        "file:" + parentPath,
                        "classpath:/static/",
                        "classpath:/public/"
                );
    }
}

