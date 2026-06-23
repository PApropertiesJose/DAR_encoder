using DAR.OfflineSync.Api.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DAR.OfflineSync.Api
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        public void ConfigureServices(IServiceCollection services)
        {
            services.AddScoped<IOfflineTaskSyncRepository, OfflineTaskSyncRepository>();

            // CORS so the Vite dev server / PWA can call the API directly.
            services.AddCors(options =>
            {
                options.AddPolicy("OfflineClient", policy =>
                    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
            });

            services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_2);
        }

        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            if (env.IsDevelopment())
                app.UseDeveloperExceptionPage();

            app.UseCors("OfflineClient");
            app.UseMvc();
        }
    }
}
