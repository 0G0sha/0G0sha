import { Job } from "bullmq";
import { v4 as uuidv4 } from 'uuid';

export const sendEmail = async (data: any) => {
     try {
          const id: string = uuidv4()
          console.log(data, id)
     }
     catch (err) {
          console.error(`[sendEmail] Failed to send email type "${data.type}":`, err);
          throw err;
     }
}

export const jobProcessor = async (job: Job): Promise<any> => {
     await sendEmail(job.data);
};
