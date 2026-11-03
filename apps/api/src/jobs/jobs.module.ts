import { Global, Module, type DynamicModule } from "@nestjs/common";
import { JobRunner, RUN_WORKER } from "./job-runner.service.js";
import { JobsService } from "./jobs.service.js";

@Global()
@Module({})
export class JobsModule {
  static forRoot(runWorker: boolean): DynamicModule {
    return {
      module: JobsModule,
      providers: [JobsService, JobRunner, { provide: RUN_WORKER, useValue: runWorker }],
      exports: [JobsService],
    };
  }
}
