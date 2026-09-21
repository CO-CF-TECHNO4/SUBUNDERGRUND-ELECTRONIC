
import AudioWorkshopPage from '../pages/audio-workshop.t4';
import HardwarePage from '../pages/hardware.t4';
import ThreadsPage from '../pages/threads.t4';
import AboutPage from '../pages/about.t4';
import NotFoundPage from '../pages/404.t4';

var routes = [
  {
    path: '/',
    component: AudioWorkshopPage,
  },
  {
    path: '/hardware/',
    component: HardwarePage,
  },
  {
    path: '/threads/',
    component: ThreadsPage,
  },
  {
    path: '/about/',
    component: AboutPage,
  },
  {
    path: '(.*)',
    component: NotFoundPage,
  },
];

export default routes;